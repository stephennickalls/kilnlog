// server/api/sensors/[id].delete.js
// DELETE /api/sensors/:id — delete a sensor (ownership checked)

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  // Verify ownership
  const { data: existing } = await db
    .from('sensors')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Sensor not found' })

  const { error } = await db.from('sensors').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})