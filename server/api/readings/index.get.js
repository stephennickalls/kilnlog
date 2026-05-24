// server/api/readings/index.get.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const query = getQuery(event)
  if (!query.firingId) throw createError({ statusCode: 400, statusMessage: 'firingId is required' })

  const firingId = Number(query.firingId)

  // Verify the firing belongs to this user before returning readings
  const { data: firing } = await db
    .from('firings')
    .select('id')
    .eq('id', firingId)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 403, statusMessage: 'Firing not found' })

  const { data, error } = await db
    .from('readings')
    .select('*')
    .eq('firing_id', firingId)
    .order('timestamp', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})