// server/api/demo-firing/index.delete.js
//
// DELETE /api/demo-firing - remove every demo firing in the CALLER's account,
// children included (readings, schedule, cone drops and reductions CASCADE).
//
// USER-SCOPED, NOT ADMIN. Deleting your own demo must not require staff.
//
// Filtered on is_demo = true, so this can never touch a real firing no matter
// what state the account is in. That guarantee is the entire reason the column
// exists; do not relax the filter.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const { data: demos, error: readErr } = await db
    .from('firings')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_demo', true)

  if (readErr) throw await serverError('demo.delete_lookup_failed', readErr, { userId: user.id })

  const count = (demos ?? []).length
  if (!count) return { ok: true, deleted: 0 }

  const { error } = await db
    .from('firings')
    .delete()
    .eq('user_id', user.id)
    .eq('is_demo', true)

  if (error) throw await serverError('demo.delete_failed', error, { userId: user.id })

  await logger.tracked('info', 'demo.firings_deleted', { userId: user.id, count })

  return { ok: true, deleted: count }
})