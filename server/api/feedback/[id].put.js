// server/api/feedback/[id].put.js
// PUT /api/feedback/:id — admin only. Update status (open / done / dismissed).

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  if (!['open', 'done', 'dismissed'].includes(body?.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const db = serviceClient()
  const { data, error } = await db
    .from('feedback')
    .update({ status: body.status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw serverError('feedback.update.failed', error, { feedbackId: id })
  return data
})