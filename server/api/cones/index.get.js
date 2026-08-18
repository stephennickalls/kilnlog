// File: server/api/cones/index.get.js
// Cone reference list - powers the schedule editor cone field, the cone-drop
// picker, and (CONE-FIRST, Aug 2026) the chart's cone ruler, the next-cone
// ETA, and the reduction planner's cone picker.
//
// temp_c is the Orton ~60C/hr rating in CELSIUS, like every other temperature
// crossing this API. Only labels convert (useTempUnit). It is a REFERENCE, not
// an authority: cones measure heatwork, so the same cone falls lower on a
// slower approach. Anything built on it displays with a "~".
export default defineEventHandler(async (event) => {
  // requireSubscription:false - pure reference data; must work in trial-edge
  // states so the cone-drop sheet can open mid-firing (same reasoning as the
  // schedules list read path).
  const { db, user } = await useServerUser(event, { requireSubscription: false })
  const { data, error } = await db
    .from('cones')
    .select('id, name, sort_order, temp_c')
    .order('sort_order', { ascending: true })
  if (error) throw await serverError('cones.list.failed', error, { userId: user.id })
  return data ?? []
})