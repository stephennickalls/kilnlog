// server/api/schedules/index.post.js
const MIN_TEMP = -200
const MAX_TEMP = 1400
const MAX_REDUCTIONS = 50

function sanitizeReductions(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const r of input.slice(0, MAX_REDUCTIONS)) {
    const start = Number(r?.startTemp)
    if (!Number.isFinite(start) || start < MIN_TEMP || start > MAX_TEMP) continue
    let end = null
    if (r?.endTemp !== null && r?.endTemp !== undefined && r?.endTemp !== '') {
      const e = Number(r.endTemp)
      if (!Number.isFinite(e) || e < MIN_TEMP || e > MAX_TEMP) continue
      if (Math.round(e) === Math.round(start)) continue   // end must differ
      end = Math.round(e)
    }
    out.push({ start_temp: Math.round(start), end_temp: end })
  }
  return out
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const body = await readBody(event)
  const { name, type, cone, description, source, points } = body

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Schedule name is required' })
  if (!type?.trim()) throw createError({ statusCode: 400, statusMessage: 'Schedule type is required' })

  const validSource = ['custom', 'from_firing', 'preset_copy'].includes(source) ? source : 'custom'

  const { data: schedule, error } = await db
    .from('schedule_library')
    .insert({
      name: name.trim(),
      type: type.trim(),
      cone: cone?.trim() || null,
      description: description?.trim()?.slice(0, 500) || null,  // G10
      source: validSource,
      is_built_in: 0,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw await serverError('schedules.create.failed', error, { userId: user.id })

  if (Array.isArray(points) && points.length) {
    const rows = points
      .filter(p => p.offsetMinutes >= 0 && p.targetTemp >= 0)
      .map(p => ({ library_id: schedule.id, offset_minutes: Number(p.offsetMinutes), target_temp: Number(p.targetTemp) }))
    if (rows.length) {
      const { error: ptErr } = await db.from('schedule_library_points').insert(rows)
      if (ptErr) throw await serverError('schedules.create.points_failed', ptErr, { userId: user.id, scheduleId: schedule.id })
    }
  }

  const reductions = sanitizeReductions(body.reductions)
  if (reductions.length) {
    const rows = reductions.map(r => ({ library_id: schedule.id, start_temp: r.start_temp, end_temp: r.end_temp }))
    const { error: redErr } = await db.from('reduction_periods').insert(rows)
    if (redErr) throw await serverError('schedules.create.reductions_failed', redErr, { userId: user.id, scheduleId: schedule.id })
  }

  logger.info('schedules.create.success', { scheduleId: schedule.id, userId: user.id, source: validSource })
  return schedule
})