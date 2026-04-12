// server/api/firings/index.get.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const { data, error } = await db
    .from('firings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})