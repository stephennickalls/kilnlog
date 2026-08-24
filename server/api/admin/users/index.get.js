// File: server/api/admin/users/index.get.js
// GET /api/admin/users — every user with usage stats, via the
// admin_user_stats() security-definer function (which re-checks the caller is
// an admin at the SQL level, so this is belt AND braces).
// Search / filter / sort happen client-side: beta scale is tens of users, and
// one payload beats four filter round-trips. Revisit if the user count ever
// makes this response heavy.
//
// DEMO FLAG (Aug 2026): admin_user_stats() reports live_firing but not whether
// that firing is a demo, and an unended demo looks identical to a real firing
// in progress on the users page. Rather than change the SQL function, the
// active firings are fetched here and merged in as live_firing_is_demo.
// RLS bypass justified: firings is owner-scoped, so a user-scoped client would
// only ever see the admin's own rows. The admin gate above has already passed.
export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  const { data, error } = await db.rpc('admin_user_stats')
  if (error) throw await serverError('admin.users.stats_failed', error, { userId: user.id })

  const rows = data ?? []
  if (!rows.length) return rows

  const { data: active, error: activeErr } = await serviceClient()
    .from('firings')
    .select('user_id, is_demo')
    .is('ended_at', null)
    .not('started_at', 'is', null)

  // Cosmetic: losing the flag must not take the whole user list with it.
  if (activeErr) {
    logger.warn('admin.users.active_firing_failed', { userId: user.id, err: activeErr })
    return rows
  }

  const demoByUser = new Map((active ?? []).map(f => [f.user_id, !!f.is_demo]))

  return rows.map(r => ({
    ...r,
    live_firing_is_demo: demoByUser.get(r.id) ?? false,
  }))
})