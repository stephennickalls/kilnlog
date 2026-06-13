// File: server/api/reductions/[id].put.js
// PUT /api/reductions/:id — end (close) a reduction period.
// Body: { endTemp: number }  (current reading at the moment of the tap)
// Enforces endTemp > start_temp (matches the DB check; we validate here for a
// clean 400 instead of a 23514 constraint error).
const MIN_TEMP = -200
const MAX_TEMP = 1400

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody(event) ?? {}
  const endTemp = Number(body.endTemp)
  if (!Number.isFinite(endTemp) || endTemp < MIN_TEMP || endTemp > MAX_TEMP) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid end temperature' })
  }

  // Fetch the period; RLS already restricts to periods the caller owns, but
  // read start_temp so we can validate ordering and give a clear message.
  const { data: period } = await db
    .from('reduction_periods')
    .select('id, start_temp, end_temp')
    .eq('id', id)
    .single()

  if (!period) throw createError({ statusCode: 404, statusMessage: 'Reduction period not found' })
  if (period.end_temp !== null) {
    throw createError({ statusCode: 409, statusMessage: 'This reduction period is already closed.' })
  }
  if (endTemp <= period.start_temp) {
    throw createError({
      statusCode: 400,
      statusMessage: `End temperature must be above the start (${Math.round(period.start_temp)}°C).`,
    })
  }

  const { data, error } = await db
    .from('reduction_periods')
    .update({ end_temp: endTemp })
    .eq('id', id)
    .select('id, start_temp, end_temp, created_at')
    .single()

  if (error) throw await serverError('reductions.end.failed', error, { userId: user.id, reductionId: id })
  return data
})