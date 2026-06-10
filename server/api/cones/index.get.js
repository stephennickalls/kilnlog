// server/api/cones/index.get.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const { data, error } = await db
    .from('cones')
    .select('id, name')
    .order('sort_order', { ascending: true })
  if (error) throw await serverError('cones.list.failed', error, { userId: user.id })
  return data ?? []
})