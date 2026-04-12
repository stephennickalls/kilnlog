// server/api/sensors/index.get.js
// GET /api/sensors — list sensors for the authenticated user
// Also returns last_seen info so the UI can show online/offline status

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const { data, error } = await db
    .from('sensors')
    .select('id, name, token, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})