// File: server/api/schedules/[id].put.js
// Ownership re-checked against user_id, so built-ins (user_id NULL) cannot be
// edited here — the UI duplicates a preset before editing.
const MIN_TEMP = -200
const MAX_TEMP = 1400
const MAX_REDUCTIONS = 50
const KINDS = ['reduction', 'oxidation']

function sanitizeReductions(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const r of input.slice(0, MAX_REDUCTIONS)) {
    const start = Number(r?.startTemp ?? r?.start_temp)
    if (!Number.isFinite(start) || start < MIN_TEMP || start > MAX_TEMP) continue
    let end = null
    const rawEnd = r?.endTemp ?? r?.end_temp
    if (rawEnd !== null && rawEnd !== undefined && rawEnd !== '') {
      const e = Number(rawEnd)
      if (!Number.isFinite(e) || e < MIN_TEMP || e > MAX_TEMP) continue
      if (Math.round(e) === Math.round(start)) continue
      end = Math.round(e)
    }
    const kind = KINDS.includes(r?.kind) ? r.kind : 'reduction'
    out.push({ start_temp: Math.round(start), end_temp: end, kind })
  }
  return out
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: existing } = await db
    .from('schedule_library')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Schedule not found' })

  const updates = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.type !== undefined) updates.type = body.type.trim()
  if (body.cone !== undefined) updates.cone = body.cone?.trim() || null
  if (body.description !== undefined) updates.description = body.description?.trim()?.slice(0, 500) || null
  if (body.conePack !== undefined) updates.cone_pack = await sanitizeConePack(db, body.conePack)

  if (Object.keys(updates).length) {
    const { error } = await db.from('schedule_library').update(updates).eq('id', id)
    if (error) throw await serverError('schedules.update.failed', error, { userId: user.id, scheduleId: id })
  }

  // Replace points wholesale when provided (simplest correct semantics).
  if (Array.isArray(body.points)) {
    await db.from('schedule_library_points').delete().eq('library_id', id)
    const rows = body.points
      .filter(p => p.offsetMinutes >= 0 && p.targetTemp >= 0)
      .map(p => ({ library_id: id, offset_minutes: Number(p.offsetMinutes), target_temp: Number(p.targetTemp) }))
    if (rows.length) {
      const { error: ptErr } = await db.from('schedule_library_points').insert(rows)
      if (ptErr) throw await serverError('schedules.update.points_failed', ptErr, { userId: user.id, scheduleId: id })
    }
  }

  // Replace planned reductions wholesale when provided (library_id rows).
  if (Array.isArray(body.reductions)) {
    await db.from('reduction_periods').delete().eq('library_id', id)
    const reductions = sanitizeReductions(body.reductions)
    if (reductions.length) {
      const rows = reductions.map(r => ({ library_id: id, start_temp: r.start_temp, end_temp: r.end_temp, kind: r.kind }))
      const { error: redErr } = await db.from('reduction_periods').insert(rows)
      if (redErr) throw await serverError('schedules.update.reductions_failed', redErr, { userId: user.id, scheduleId: id })
    }
  }

  logger.info('schedules.update.success', { scheduleId: id, userId: user.id })
  return { ok: true }
})