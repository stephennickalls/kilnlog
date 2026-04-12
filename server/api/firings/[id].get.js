// server/api/firings/[id].get.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: firing, error } = await db
    .from('firings')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const [{ data: schedulePoints }, { data: readingRows }, { data: assignedSensors }] = await Promise.all([
    db.from('schedule').select('*').eq('firing_id', id).order('offset_minutes', { ascending: true }),
    db.from('readings').select('*').eq('firing_id', id).order('timestamp', { ascending: true }),
    db.from('firing_sensors').select('sensor_id, role, sensors(id, name)').eq('firing_id', id),
  ])

  return {
    ...firing,
    schedule:  schedulePoints ?? [],
    readings:  readingRows ?? [],
    sensors:   assignedSensors ?? [],
  }
})