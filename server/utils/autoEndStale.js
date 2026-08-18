// File: server/utils/autoEndStale.js
//
// Auto-end sweep, extracted from server/api/firings/index.get.js so it can be
// shared by GET /api/firings and GET /api/bootstrap without duplication.
//
// THRESHOLD HISTORY (each bump because a real firing got closed under a user):
//   2h/1h -> 12h (Jul/Aug 2026) -> per-firing, Aug 2026 (cone-first rebuild).
// The limit is now DATA, not a constant: firings.auto_end_hours, set at
// creation from the fuel (gas 36h, wood 96h). NULL falls back to
// AUTO_END_DEFAULT_HOURS below - that covers every firing created before the
// column existed.
//
// Rules:
//   Auto-end an active firing when:
//     - No readings for its limit, OR
//     - Started but never had a reading, and started longer ago than its limit
//       (covers overnight candling before the first log).
//   EXEMPT:
//     - Paused firings (paused_at set) - deliberately suspended.
//     - Just-restarted firings whose only readings predate the restart.
//
// ANY UI THAT STATES THE THRESHOLD MUST READ firing.auto_end_hours, not a
// hardcoded string. AutoEndedNotice.vue does; the README bullet must match.
//
// PERF: fetches only the LATEST reading timestamp per firing (ordered nested
// select, limit 1) instead of pulling every reading row's timestamp across the
// wire. (PostgREST aggregate functions are disabled by default on Supabase,
// so max() isn't available - ordered limit-1 achieves the same with the
// existing (firing_id, timestamp) index.)
//
// Returns the array of firing ids that were auto-ended (possibly empty).

// Fallback for rows with auto_end_hours NULL (pre-migration firings).
export const AUTO_END_DEFAULT_HOURS = 24

// Per-fuel limits applied at creation time by POST /api/firings.
export const AUTO_END_HOURS_BY_FUEL = { gas: 36, wood: 96 }

export function autoEndLimitSeconds(firing) {
  const hours = Number(firing?.auto_end_hours)
  return (Number.isFinite(hours) && hours > 0 ? hours : AUTO_END_DEFAULT_HOURS) * 3600
}

export async function autoEndStale(db, userId) {
  const { data: activeFirings, error } = await db
    .from('firings')
    .select(`
      id, started_at, paused_at, restarted_at, auto_end_hours,
      readings:readings(timestamp)
    `)
    .eq('user_id', userId)
    .is('ended_at', null)
    .not('started_at', 'is', null)
    .order('timestamp', { referencedTable: 'readings', ascending: false })
    .limit(1, { referencedTable: 'readings' })

  if (error) throw await serverError('firings.autoend.query_failed', error, { userId })

  const now = Math.floor(Date.now() / 1000)
  const toAutoEnd = []

  for (const firing of activeFirings ?? []) {
    if (firing.paused_at) continue

    // Nested select is ordered desc + limit 1 -> [{ timestamp }] or [].
    const lastTs = firing.readings?.[0]?.timestamp ?? null

    // A just-restarted firing has only stale readings (all older than the
    // restart). Exempt it until the user logs a fresh reading.
    if (firing.restarted_at && (lastTs === null || lastTs < firing.restarted_at)) continue

    // One limit for both rules - a firing that has never been logged is not
    // more suspicious than one that stopped being logged.
    const limit = autoEndLimitSeconds(firing)

    if (lastTs === null) {
      if (now - firing.started_at > limit) toAutoEnd.push(firing.id)
    } else if (now - lastTs > limit) {
      toAutoEnd.push(firing.id)
    }
  }

  if (toAutoEnd.length) {
    const { error: endErr } = await db
      .from('firings')
      .update({ ended_at: now, auto_ended: true })
      .in('id', toAutoEnd)
      .eq('user_id', userId)

    if (endErr) throw await serverError('firings.autoend.update_failed', endErr, { userId, toAutoEnd })

    // Durable + visible: every auto-end is a tester who walked away mid-firing
    // (or an app failure to log) - exactly the signal /admin/logs exists for.
    await logger.tracked('warn', 'firing.auto_ended', { userId, firingIds: toAutoEnd, count: toAutoEnd.length })
  }

  return toAutoEnd
}