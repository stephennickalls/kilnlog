// server/api/sensors/index.post.js
// POST /api/sensors — create a new sensor for the authenticated user

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const body = await readBody(event)
  const name = body?.name?.trim() || 'My Sensor'

  const { data, error } = await db
    .from('sensors')
    .insert({ user_id: user.id, name })
    .select('id, name, token, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})