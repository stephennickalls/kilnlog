// server/api/cone-drops/[id].delete.js
// DELETE /api/cone-drops/:id — remove a mis-logged cone drop. RLS restricts
// to rows whose parent firing the caller owns; the explicit exists-check gives
// a clean 404 instead of a silent no-op.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const id = parseInt(event.context.params.id, 10)
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const { data: existing, error: lookErr } = await db
    .from('cone_drops')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (lookErr) throw await serverError('cones.drop.delete_lookup_failed', lookErr, { userId: user.id, id })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Cone drop not found' })

  const { error } = await db.from('cone_drops').delete().eq('id', id)
  if (error) throw await serverError('cones.drop.delete_failed', error, { userId: user.id, id })

  return { deleted: true, id }
})