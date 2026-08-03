// server/api/feedback/index.post.js
// POST /api/feedback — any authenticated user submits a bug report or feature
// request. Table is policy-less (like logs), so we insert via serviceClient()
// after the auth check. Light validation + length cap.

const MAX_LEN = 2000

export default defineEventHandler(async (event) => {
  const { user, profile } = await useServerUser(event, { requireSubscription: false })
  const body = await readBody(event)

  const type = body?.type
  const message = String(body?.message ?? '').trim()

  if (!['bug', 'feature'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid type' })
  }
  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  }
  if (message.length > MAX_LEN) {
    throw createError({ statusCode: 400, statusMessage: `Message too long (max ${MAX_LEN} chars)` })
  }

  const db = serviceClient()
  const { data, error } = await db
    .from('feedback')
    .insert({
      user_id: user.id,
      email: profile?.email ?? user.email ?? null,
      type,
      message,
      page: typeof body?.page === 'string' ? body.page.slice(0, 200) : null,
      context: {
        userAgent: getHeader(event, 'user-agent')?.slice(0, 300) ?? null,
      },
    })
    .select('id')
    .single()

  if (error) throw serverError('feedback.create.failed', error, { userId: user.id })

  await logger.tracked('info', 'feedback.created', { userId: user.id, feedbackId: data.id, type })
  return { id: data.id }
})