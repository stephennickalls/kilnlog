// File: server/api/reductions/[id].put.js
// PUT /api/reductions/:id - end (close) an atmosphere period.
// Body: { endTemp: number }  (current reading at the moment of the tap)
//
// REDUCTION-TIME (Aug 2026): periods are anchored by TIME - created_at opens
// the band, ended_at (set here) closes it. end_temp is a recorded fact, not
// geometry, so ANY end temperature is valid: above the start (climbing),
// below it (kilns routinely stall or dip in reduction - incomplete combustion
// costs efficiency), or exactly equal. The old "must differ" rule existed only
// to prevent a zero-width band under temp-anchoring; the matching DB CHECK
// (end_temp <> start_temp) must be dropped alongside this.
//
// CONE-FIRST (Aug 2026): kind is set at open and never changed here - closing
// a band records when it ended, not what it was. It is returned so the client
// row shape matches the POST.
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

  // Fetch the period; RLS already restricts to periods the caller owns.
  const { data: period } = await db
    .from('reduction_periods')
    .select('id, end_temp, ended_at')
    .eq('id', id)
    .single()

  if (!period) throw createError({ statusCode: 404, statusMessage: 'Reduction period not found' })
  if (period.end_temp !== null || period.ended_at !== null) {
    throw createError({ statusCode: 409, statusMessage: 'This reduction period is already closed.' })
  }

  const { data, error } = await db
    .from('reduction_periods')
    .update({ end_temp: endTemp, ended_at: Math.floor(Date.now() / 1000) })
    .eq('id', id)
    .select('id, start_temp, end_temp, created_at, ended_at, origin, kind')
    .single()

  if (error) throw await serverError('reductions.end.failed', error, { userId: user.id, reductionId: id })
  return data
})