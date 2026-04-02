export default defineEventHandler(async () => {
  const db = useSupabase()
  const { data, error } = await db.from('firings').select('*').order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})