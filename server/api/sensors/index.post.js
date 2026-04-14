// server/api/sensors/index.get.js
// GET /api/sensors — list sensors for the authenticated user

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const { data, error } = await db
    .from('sensors')
    .select('id, name, token, created_at, last_seen')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})