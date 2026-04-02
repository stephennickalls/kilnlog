export default defineEventHandler(async () => {
  const db = useSupabase()

  const { data: libraries, error } = await db
    .from('schedule_library')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return Promise.all(libraries.map(async lib => {
    const { data: points } = await db
      .from('schedule_library_points')
      .select('*')
      .eq('library_id', lib.id)
      .order('offset_minutes', { ascending: true })
    return { ...lib, points: points ?? [] }
  }))
})