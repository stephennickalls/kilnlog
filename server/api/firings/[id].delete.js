// server/api/firings/[id].delete.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  // Verify ownership first
  const { data: existing, error: fetchErr } = await db
    .from('firings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !existing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const { error } = await db.from('firings').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})