// File: server/api/reductions/[id].delete.js
// DELETE /api/reductions/:id — remove a reduction period (correction/undo).
// RLS (reduction_mutate) restricts to periods whose parent the caller owns.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: existing } = await db
    .from('reduction_periods').select('id').eq('id', id).single()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Reduction period not found' })

  const { error } = await db.from('reduction_periods').delete().eq('id', id)
  if (error) throw await serverError('reductions.delete.failed', error, { userId: user.id, reductionId: id })
  return { ok: true }
})