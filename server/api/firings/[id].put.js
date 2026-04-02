export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useSupabase()

  const updates = {}
  if (body.startedAt !== undefined) updates.started_at = body.startedAt
  if (body.endedAt   !== undefined) updates.ended_at   = body.endedAt
  if (body.notes     !== undefined) updates.notes      = body.notes

  const { data, error } = await db
    .from('firings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})