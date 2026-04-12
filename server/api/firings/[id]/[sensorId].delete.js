// server/api/firings/[id]/sensors/[sensorId].delete.js
// DELETE /api/firings/:id/sensors/:sensorId — remove a sensor from a firing

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const firingId = Number(getRouterParam(event, 'id'))
  const sensorId = getRouterParam(event, 'sensorId')

  // Verify firing ownership
  const { data: firing } = await db
    .from('firings')
    .select('id')
    .eq('id', firingId)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const { error } = await db
    .from('firing_sensors')
    .delete()
    .eq('firing_id', firingId)
    .eq('sensor_id', sensorId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})