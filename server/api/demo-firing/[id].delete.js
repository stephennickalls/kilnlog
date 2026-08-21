// server/api/admin/demo-firing/[id].delete.js
//
// DELETE /api/admin/demo-firing/:id?userId=<uuid>
// Removes one firing from a target user's account, children included
// (readings, schedule, cone drops and reductions all CASCADE).
//
// The userId query param is not redundant: it makes the delete a scoped,
// deliberate act rather than "delete firing 412 from wherever it lives", and a
// mismatch is a 404 instead of a silent cross-account delete.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const { user: actor } = await requireAdmin(event)

  const id     = Number(getRouterParam(event, 'id'))
  const userId = getQuery(event).userId

  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid firing id' })
  if (!UUID.test(userId ?? '')) throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })

  const db = serviceClient()

  const { data: firing } = await db
    .from('firings')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found for that user' })

  const { error } = await db.from('firings').delete().eq('id', id)
  if (error) {
    throw await serverError('admin.demo.delete_failed', error, { userId: actor.id, targetId: userId, firingId: id })
  }

  await logger.tracked('warn', 'admin.demo.firing_deleted', {
    userId:     actor.id,
    targetId:   userId,
    firingId:   id,
    firingName: firing.name,
  })

  return { ok: true }
})