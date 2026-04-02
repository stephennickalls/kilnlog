export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  if (!query.firingId) throw createError({ statusCode: 400, statusMessage: 'firingId is required' })

  const db = useSupabase()

  const { data, error } = await db
    .from('readings')
    .select('*')
    .eq('firing_id', Number(query.firingId))
    .order('timestamp', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})