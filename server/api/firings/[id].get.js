// File: server/api/firings/[id].get.js
// Single query with nested selects — schedule, readings, and reduction periods
// come back in one round trip.
//
// G11 CHANGE: added reductions:reduction_periods(*) to the nested select so the
// chart overlay has the bands without a second request.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: firing, error } = await db
    .from('firings')
    .select(`
      *,
      schedule:schedule(*),
      readings:readings(*),
      reductions:reduction_periods(id, start_temp, end_temp, created_at)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  // Nested rows aren't guaranteed ordered — sort after the single fetch.
  firing.schedule   = (firing.schedule ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
  firing.readings   = (firing.readings ?? []).sort((a, b) => a.timestamp - b.timestamp)
  firing.reductions = (firing.reductions ?? []).sort((a, b) => a.created_at - b.created_at)

  return firing
})