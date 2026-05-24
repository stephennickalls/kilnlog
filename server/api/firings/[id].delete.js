// server/api/firings/[id].delete.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  // Verify ownership before deleting
  const { data: existing } = await db
    .from('firings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  // Delete child records first (belt and braces alongside any DB cascades)
  await Promise.all([
    db.from('readings').delete().eq('firing_id', id),
    db.from('schedule').delete().eq('firing_id', id),
    db.from('firing_sensors').delete().eq('firing_id', id),
  ])

  const { error } = await db.from('firings').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true }
})