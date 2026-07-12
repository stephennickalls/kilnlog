// server/api/firings/index.get.js
// GET /api/firings — list all firings for the authenticated user.
//
// PERF REFACTOR (Jul 2026): the auto-end staleness sweep moved to the shared
// server/utils/autoEndStale.js (also used by /api/bootstrap), and now fetches
// only the latest reading timestamp per active firing instead of every
// timestamp. Rules and exemptions are unchanged — see that file.

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  await autoEndStale(db, user.id)

  const { data, error } = await db
    .from('firings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw await serverError('firings.list.query_failed', error, { userId: user.id })

  return data ?? []
})