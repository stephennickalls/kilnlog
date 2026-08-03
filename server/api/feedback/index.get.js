// server/api/feedback/index.get.js
// GET /api/feedback — admin only. Newest first.
// Query params: ?status=open|done|dismissed  ?type=bug|feature  ?limit=100

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = serviceClient()
  const q = getQuery(event)

  let query = db
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(q.limit) || 100, 500))

  if (['open', 'done', 'dismissed'].includes(q.status)) query = query.eq('status', q.status)
  if (['bug', 'feature'].includes(q.type))              query = query.eq('type', q.type)

  const { data, error } = await query
  if (error) throw serverError('feedback.list.failed', error)
  return data ?? []
})