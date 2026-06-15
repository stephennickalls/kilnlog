// server/api/schedules/[id].put.js
// Ownership re-checked against user_id, so built-ins (user_id NULL) cannot be
// edited here — the UI should Duplicate a preset before editing.
//
// G11 fast-follow: planned reductions are replaced wholesale (like points)
// when a `reductions` array is provided. Each is { startTemp, endTemp|null };
// end may be above OR below start (cooling) but not equal; null end = open band.
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
      if (e === startTemp) continue
      endTemp = e
    }
    out.push({ start_temp: startTemp, end_temp: endTemp })
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

  if (Object.keys(updates).length) {
    const { error } = await db.from('schedule_library').update(updates).eq('id', id)
    if (error) throw await serverError('schedules.update.failed', error, { userId: user.id, scheduleId: id })
  }

  // Replace points wholesale when provided (simplest correct semantics)
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

  // G11: replace planned reductions wholesale when provided. Only the library_id
  // rows for THIS schedule are touched (firing reductions are unaffected).
  if (Array.isArray(body.reductions)) {
    await db.from('reduction_periods').delete().eq('library_id', id)
    const redRows = sanitizeReductions(body.reductions).map(r => ({ ...r, library_id: id }))
    if (redRows.length) {
      const { error: redErr } = await db.from('reduction_periods').insert(redRows)
      if (redErr) throw await serverError('schedules.update.reductions_failed', redErr, { userId: user.id, scheduleId: id })
    }
  }

  const { data, error } = await db
    .from('schedule_library')
    .select('*, points:schedule_library_points(*), reductions:reduction_periods(*)')
    .eq('id', id)
    .single()
  if (error) throw await serverError('schedules.update.refetch_failed', error, { userId: user.id, scheduleId: id })

  data.points = (data.points ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
  logger.info('schedules.update.success', { scheduleId: id, userId: user.id })
  return data
})