// server/api/firings/index.post.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const { name, notes, schedulePoints, mode, sensorIds } = body

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Firing name is required' })

  // Create the firing
  const { data: firing, error } = await db
    .from('firings')
    .insert({ name: name.trim(), notes: notes?.trim() || null, mode: mode ?? 'manual', user_id: user.id })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Insert schedule points
  if (Array.isArray(schedulePoints) && schedulePoints.length > 0) {
    const points = schedulePoints
      .filter(p => p.offsetMinutes >= 0 && p.targetTemp >= 0)
      .map(p => ({ firing_id: firing.id, offset_minutes: Number(p.offsetMinutes), target_temp: Number(p.targetTemp) }))
    if (points.length > 0) {
      const { error: schedErr } = await db.from('schedule').insert(points)
      if (schedErr) throw createError({ statusCode: 500, statusMessage: schedErr.message })
    }
  }

  // Assign sensors to this firing via firing_sensors join table
  if (Array.isArray(sensorIds) && sensorIds.length > 0) {
    const rows = sensorIds.map(id => ({ firing_id: firing.id, sensor_id: id }))
    const { error: sensorErr } = await db.from('firing_sensors').insert(rows)
    if (sensorErr) throw createError({ statusCode: 500, statusMessage: sensorErr.message })
  }

  return firing
})