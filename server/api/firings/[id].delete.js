// server/api/firings/[id].delete.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: existing } = await db
    .from('firings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  await Promise.all([
    db.from('readings').delete().eq('firing_id', id),
    db.from('schedule').delete().eq('firing_id', id),
  ])

  const { error } = await db.from('firings').delete().eq('id', id)
  if (error) throw await serverError('firings.delete.failed', error, { userId: user.id, firingId: id })
  return { ok: true }
})