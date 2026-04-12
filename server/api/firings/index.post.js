// server/api/firings/index.post.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const { name, notes, schedulePoints, mode } = body

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Firing name is required' })

  const { data: firing, error } = await db
    .from('firings')
    .insert({ name: name.trim(), notes: notes?.trim() || null, mode: mode ?? 'manual', user_id: user.id })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (Array.isArray(schedulePoints) && schedulePoints.length > 0) {
    const points = schedulePoints
      .filter(p => p.offsetMinutes >= 0 && p.targetTemp >= 0)
      .map(p => ({ firing_id: firing.id, offset_minutes: Number(p.offsetMinutes), target_temp: Number(p.targetTemp) }))
    if (points.length > 0) {
      const { error: schedErr } = await db.from('schedule').insert(points)
      if (schedErr) throw createError({ statusCode: 500, statusMessage: schedErr.message })
    }
  }

  return firing
})