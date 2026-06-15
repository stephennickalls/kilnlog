// server/api/schedules/index.post.js
//
// G11 fast-follow: a schedule can carry PLANNED reduction periods, saved
// wholesale alongside points (same pattern). Each reduction is
// { startTemp, endTemp|null } and is stored on reduction_periods with
// library_id set (firing_id null). RLS (reduction_mutate) permits this only
// for the caller's own schedule. end may be above OR below start (cooling
// reductions) but not equal; null end = planned-open band.
const MIN_TEMP = -200
const MAX_TEMP = 1400

function sanitizeReductions(reductions) {
  if (!Array.isArray(reductions)) return []
  const out = []
  for (const r of reductions) {
    const startTemp = Number(r?.startTemp)
    if (!Number.isFinite(startTemp) || startTemp < MIN_TEMP || startTemp > MAX_TEMP) continue
    let endTemp = null
    if (r?.endTemp !== null && r?.endTemp !== undefined && r?.endTemp !== '') {
      const e = Number(r.endTemp)
      if (!Number.isFinite(e) || e < MIN_TEMP || e > MAX_TEMP) continue
      if (e === startTemp) continue   // zero-width is meaningless
      endTemp = e
    }
    out.push({ start_temp: startTemp, end_temp: endTemp })
  }
  return out
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const body = await readBody(event)
  const { name, type, cone, source, points, reductions } = body

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Schedule name is required' })
  if (!type?.trim()) throw createError({ statusCode: 400, statusMessage: 'Schedule type is required' })

  const validSource = ['custom', 'from_firing', 'preset_copy'].includes(source) ? source : 'custom'

  const { data: schedule, error } = await db
    .from('schedule_library')
    .insert({
      name: name.trim(),
      type: type.trim(),
      cone: cone?.trim() || null,
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

  // G11: planned reductions (library_id set, firing_id null).
  const redRows = sanitizeReductions(reductions).map(r => ({ ...r, library_id: schedule.id }))
  if (redRows.length) {
    const { error: redErr } = await db.from('reduction_periods').insert(redRows)
    if (redErr) throw await serverError('schedules.create.reductions_failed', redErr, { userId: user.id, scheduleId: schedule.id })
  }

  logger.info('schedules.create.success', { scheduleId: schedule.id, userId: user.id, source: validSource })
  return schedule
})