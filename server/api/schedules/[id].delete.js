// server/api/schedules/[id].delete.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: existing } = await db
    .from('schedule_library')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Schedule not found' })

  await db.from('schedule_library_points').delete().eq('library_id', id)
  const { error } = await db.from('schedule_library').delete().eq('id', id)
  if (error) throw await serverError('schedules.delete.failed', error, { userId: user.id, scheduleId: id })

  return { ok: true }
})