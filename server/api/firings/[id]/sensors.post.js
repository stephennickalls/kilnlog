// server/api/firings/[id]/sensors.post.js
// POST /api/firings/:id/sensors — assign a sensor to a firing
// Body: { sensorId: uuid }
// Can be called on a firing that's already running

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const firingId = Number(getRouterParam(event, 'id'))
  const body     = await readBody(event)
  const { sensorId } = body

  if (isNaN(firingId) || !sensorId) {
    throw createError({ statusCode: 400, statusMessage: 'firingId and sensorId required' })
  }

  // Verify firing ownership
  const { data: firing } = await db
    .from('firings')
    .select('id')
    .eq('id', firingId)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  // Verify sensor ownership
  const { data: sensor } = await db
    .from('sensors')
    .select('id')
    .eq('id', sensorId)
    .eq('user_id', user.id)
    .single()

  if (!sensor) throw createError({ statusCode: 404, statusMessage: 'Sensor not found' })

  // Upsert — safe to call even if already assigned
  const { data, error } = await db
    .from('firing_sensors')
    .upsert({ firing_id: firingId, sensor_id: sensorId }, { onConflict: 'firing_id,sensor_id' })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})