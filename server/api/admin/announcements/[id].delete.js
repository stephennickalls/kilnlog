// File: server/api/admin/announcements/[id].delete.js
// DELETE /api/admin/announcements/:id — remove a banner entirely (dismissals
// cascade). Prefer "stop" (active=false) for anything users have seen; delete
// is for drafts and mistakes.
export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { error } = await db.from('announcements').delete().eq('id', id)
  if (error) throw await serverError('announcements.admin.delete_failed', error, { userId: user.id, id })
  return { deleted: true, id }
})