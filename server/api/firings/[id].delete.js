// File: server/api/firings/[id].delete.js
//
// PACKAGE 1 CHANGE: manual child deletes removed — readings.firing_id and
// schedule.firing_id are ON DELETE CASCADE (verified in DB, 13 Jun 2026).
// The user-scoped client means RLS also enforces ownership; the explicit
// user_id check stays for a clean 404 and defence-in-depth.
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

  const { error } = await db.from('firings').delete().eq('id', id)
  if (error) throw await serverError('firings.delete.failed', error, { userId: user.id, firingId: id })
  return { ok: true }
})