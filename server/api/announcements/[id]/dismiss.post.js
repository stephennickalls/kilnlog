// File: server/api/announcements/[id]/dismiss.post.js
// POST /api/announcements/:id/dismiss — the X button. Idempotent: dismissing
// twice (double-tap, two tabs) upserts onto the (user_id, announcement_id) PK.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event, { requireSubscription: false })

  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { error } = await db
    .from('announcement_dismissals')
    .upsert({ user_id: user.id, announcement_id: id }, { onConflict: 'user_id,announcement_id' })

  if (error) throw await serverError('announcements.dismiss.failed', error, { userId: user.id, id })
  return { dismissed: true, id }
})