// File: server/api/admin/announcements/index.get.js
// GET /api/admin/announcements — every announcement with its dismissal count,
// newest first. Admin only.
export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  const { data, error } = await db
    .from('announcements')
    .select('*, dismissals:announcement_dismissals(user_id)')
    .order('created_at', { ascending: false })

  if (error) throw await serverError('announcements.admin.list_failed', error, { userId: user.id })

  return (data ?? []).map(a => ({
    ...a,
    dismissal_count: (a.dismissals ?? []).length,
    dismissals: undefined,
  }))
})