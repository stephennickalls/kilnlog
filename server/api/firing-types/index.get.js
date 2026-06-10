// server/api/firing-types/index.get.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const { data, error } = await db
    .from('firing_types')
    .select('id, name')
    .order('sort_order', { ascending: true })
  if (error) throw await serverError('firing_types.list.failed', error, { userId: user.id })
  return data ?? []
})