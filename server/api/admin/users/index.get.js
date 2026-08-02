// File: server/api/admin/users/index.get.js
// GET /api/admin/users — every user with usage stats, via the
// admin_user_stats() security-definer function (which re-checks the caller is
// an admin at the SQL level, so this is belt AND braces).
// Search / filter / sort happen client-side: beta scale is tens of users, and
// one payload beats four filter round-trips. Revisit if the user count ever
// makes this response heavy.
export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  const { data, error } = await db.rpc('admin_user_stats')
  if (error) throw await serverError('admin.users.stats_failed', error, { userId: user.id })

  return data ?? []
})