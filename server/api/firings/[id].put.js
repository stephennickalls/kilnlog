// server/api/firings/[id].put.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  // Verify ownership first
  const { data: existing, error: fetchErr } = await db
    .from('firings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !existing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const updates = {}
  if (body.startedAt !== undefined) updates.started_at = body.startedAt
  if (body.endedAt   !== undefined) updates.ended_at   = body.endedAt
  if (body.notes     !== undefined) updates.notes      = body.notes
  if (body.mode      !== undefined) updates.mode       = body.mode

  const { data, error } = await db
    .from('firings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})