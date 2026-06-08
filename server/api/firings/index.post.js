// server/api/firings/index.post.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const { name, notes, schedulePoints } = body

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Firing name is required' })

  const { data: firing, error } = await db
    .from('firings')
    .insert({ name: name.trim(), notes: notes?.trim() || null, user_id: user.id })
    .select()
    .single()

  if (error) throw await serverError('firings.create.failed', error, { userId: user.id })

  if (Array.isArray(schedulePoints) && schedulePoints.length > 0) {
    const points = schedulePoints
      .filter(p => p.offsetMinutes >= 0 && p.targetTemp >= 0)
      .map(p => ({ firing_id: firing.id, offset_minutes: Number(p.offsetMinutes), target_temp: Number(p.targetTemp) }))
    if (points.length) {
      const { error: schedErr } = await db.from('schedule').insert(points)
      if (schedErr) throw await serverError('firings.create.schedule_failed', schedErr, { userId: user.id, firingId: firing.id })
    }
  }

  return firing
})