// server/api/firings/index.get.js
// GET /api/firings — the authenticated user's firings, newest first.
//
// PERF REFACTOR (Jul 2026): the auto-end staleness sweep moved to the shared
// server/utils/autoEndStale.js (also used by /api/bootstrap), and now fetches
// only the latest reading timestamp per active firing instead of every
// timestamp. Rules and exemptions are unchanged — see that file.
//
// LAZY LIST (Aug 2026): was `select('*')` over every firing, unbounded. Now a
// page at a time:
//
//   ?limit=30    rows per page (default FIRINGS_PAGE_SIZE, capped at 100)
//   ?offset=0    rows to skip — the sidebar's "Load older" passes 30, 60, …
//
// THE RETURN SHAPE IS UNCHANGED (a plain array), deliberately. The client
// infers "there may be more" from `page.length === limit` instead of needing a
// wrapper object, so every existing caller keeps working and there's no second
// source of truth for the count.
//
// ORDER: created_at DESC, then id DESC. The id tiebreak matters — created_at
// is whole seconds, so two firings created in the same second would otherwise
// order arbitrarily, and an unstable sort makes offset paging silently drop or
// repeat rows between pages.

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  await autoEndStale(db, user.id)

  const q      = getQuery(event)
  const limit  = Math.min(Math.max(Number(q.limit) || FIRINGS_PAGE_SIZE, 1), 100)
  const offset = Math.max(Number(q.offset) || 0, 0)

  const { data, error } = await db
    .from('firings')
    .select(FIRING_LIST_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw await serverError('firings.list.query_failed', error, { userId: user.id })

  return data ?? []
})