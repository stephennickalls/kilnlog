// File: server/api/admin/announcements/index.post.js
// POST /api/admin/announcements — create a banner. Admin only.
// Body: { title?, message, link_url?, starts_at?, ends_at }  (ISO strings)
const MAX_TITLE = 120
const MAX_MESSAGE = 500
const MAX_URL = 500

export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  const body = await readBody(event) ?? {}
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > MAX_MESSAGE) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required (max 500 chars)' })
  }
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, MAX_TITLE) : null
  const linkUrl = typeof body.link_url === 'string' && body.link_url.trim() ? body.link_url.trim().slice(0, MAX_URL) : null

  const startsAt = body.starts_at ? new Date(body.starts_at) : new Date()
  const endsAt   = body.ends_at ? new Date(body.ends_at) : null
  if (!endsAt || isNaN(endsAt.getTime()) || isNaN(startsAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'A valid end date is required' })
  }
  if (endsAt <= startsAt) {
    throw createError({ statusCode: 400, statusMessage: 'End must be after start' })
  }

  const { data, error } = await db
    .from('announcements')
    .insert({
      title,
      message,
      link_url:   linkUrl,
      starts_at:  startsAt.toISOString(),
      ends_at:    endsAt.toISOString(),
      active:     true,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw await serverError('announcements.admin.create_failed', error, { userId: user.id })
  return data
})