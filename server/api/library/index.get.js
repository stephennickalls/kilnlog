// File: server/api/library/index.get.js
//
// PACKAGE 1 — fixes S2.
// Was: unauthenticated + service role + no filter → anyone on the internet
// could dump every schedule, including users' custom ones.
// Now: authenticated, user-scoped client; RLS (schedule_library_select)
// returns built-ins (user_id IS NULL) + the caller's own schedules only.
// No subscription gate — the Start Firing modal may be reachable during
// trial-edge states, and this is read-only shared data.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event, { requireSubscription: false })

  const { data, error } = await db
    .from('schedule_library')
    .select('*, points:schedule_library_points(*)')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw await serverError('library.list.failed', error, { userId: user.id })

  // Sort nested points by offset (nested order isn't guaranteed)
  return (data ?? []).map(lib => ({
    ...lib,
    points: (lib.points ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes),
  }))
})