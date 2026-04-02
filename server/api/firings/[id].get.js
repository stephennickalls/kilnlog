export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useSupabase()

  const { data: firing, error } = await db.from('firings').select('*').eq('id', id).single()
  if (error || !firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const { data: schedulePoints } = await db
    .from('schedule')
    .select('*')
    .eq('firing_id', id)
    .order('offset_minutes', { ascending: true })

  const { data: readingRows } = await db
    .from('readings')
    .select('*')
    .eq('firing_id', id)
    .order('timestamp', { ascending: true })

  return { ...firing, schedule: schedulePoints ?? [], readings: readingRows ?? [] }
})