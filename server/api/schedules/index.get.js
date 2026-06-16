// server/api/schedules/index.get.js
// GET /api/schedules — built-in presets (user_id NULL) + the user's own,
// resolved by RLS (schedule_library_select). Single nested query, no N+1.
//
// G11 fast-follow: nested-selects reduction_periods (library_id rows) so the
// library cards can show faint planned-reduction bands on the sparkline.
//
// G9: this is now the ONE schedule-list endpoint (former /api/library deleted,
// which repointed onto this). requireSubscription:false — this is a READ of
// already-RLS-protected data (built-ins + the caller's own rows only), and it
// must work during trial-edge / past-due grace states so the Start Firing modal
// can still load curves. The paywall is enforced on the WRITE paths
// (POST/PUT/DELETE schedules, POST firings/readings), not on reading your list.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event, { requireSubscription: false })

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