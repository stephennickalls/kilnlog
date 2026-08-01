// server/api/cones/index.get.js
// Cone reference list — powers the schedule editor cone field and the
// cone-drop picker (Aug 2026).
export default defineEventHandler(async (event) => {
  // requireSubscription:false — pure reference data; must work in trial-edge
  // states so the cone-drop sheet can open mid-firing (same reasoning as the
  // schedules list read path).
  const { db, user } = await useServerUser(event, { requireSubscription: false })
  const { data, error } = await db
    .from('cones')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw await serverError('cones.list.failed', error, { userId: user.id })
  return data ?? []
})