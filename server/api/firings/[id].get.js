// server/api/firings/[id].get.js
// Single query with nested selects — schedule and readings
// come back in one round trip instead of two.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: firing, error } = await db
    .from('firings')
    .select(`
      *,
      schedule:schedule(*),
      readings:readings(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  // Nested rows aren't guaranteed ordered — sort client-side after the single fetch
  firing.schedule = (firing.schedule ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
  firing.readings = (firing.readings ?? []).sort((a, b) => a.timestamp - b.timestamp)

  return firing
})