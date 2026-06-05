// server/api/readings/[id].delete.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: reading } = await db
    .from('readings')
    .select('id, firing_id')
    .eq('id', id)
    .single()

  if (!reading) throw createError({ statusCode: 404, statusMessage: 'Reading not found' })

  const { data: firing } = await db
    .from('firings')
    .select('id')
    .eq('id', reading.firing_id)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 403, statusMessage: 'Not authorised' })

  const { error } = await db.from('readings').delete().eq('id', id)
  if (error) throw await serverError('readings.delete.failed', error, { userId: user.id, readingId: id })
  return { ok: true }
})