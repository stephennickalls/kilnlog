// server/api/schedules/index.get.js
// GET /api/schedules — built-in presets (user_id NULL) + the user's own,
// resolved by RLS (schedule_library_select). Single nested query, no N+1.
//
// G11 fast-follow: nested-selects reduction_periods (library_id rows) so the
// library cards can show faint planned-reduction bands on the sparkline.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const { data, error } = await db
    .from('schedule_library')
    .select('*, points:schedule_library_points(*), reductions:reduction_periods(*)')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw await serverError('schedules.list.failed', error, { userId: user.id })

  return (data ?? []).map(s => ({
    ...s,
    points: (s.points ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes),
    reductions: s.reductions ?? [],
  }))
})