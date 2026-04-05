export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useSupabase()

  // Delete child records first (cascade may handle this but be explicit)
  await db.from('readings').delete().eq('firing_id', id)
  await db.from('schedule').delete().eq('firing_id', id)

  const { error } = await db.from('firings').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true }
})