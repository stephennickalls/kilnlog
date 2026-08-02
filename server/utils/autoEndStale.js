// File: server/utils/autoEndStale.js
//
// Auto-end sweep, extracted from server/api/firings/index.get.js so it can be
// shared by GET /api/firings and GET /api/bootstrap without duplication.
//
// Rules (Aug 2026: extended from 2h/1h to 12h — long gas firings, overnight
// candling, and testers who log sparsely were being ended mid-firing):
//   Auto-end an active firing when:
//     - No readings for 12 hours, OR
//     - Started but never had a reading, and started > 12 hours ago
//       (covers overnight candling before the first log).
//   EXEMPT:
//     - Paused firings (paused_at set) — deliberately suspended.
//     - Just-restarted firings whose only readings predate the restart.
//
// PERF: fetches only the LATEST reading timestamp per firing (ordered nested
// select, limit 1) instead of pulling every reading row's timestamp across the
// wire. (PostgREST aggregate functions are disabled by default on Supabase,
// so max() isn't available — ordered limit-1 achieves the same with the
// existing (firing_id, timestamp) index.)
//
// Returns the array of firing ids that were auto-ended (possibly empty).

const STALE_GAP    = 12 * 60 * 60   // no readings for this long → auto-end
const NEVER_LOGGED = 12 * 60 * 60   // started, zero readings, this old → auto-end

export async function autoEndStale(db, userId) {
  const { data: activeFirings, error } = await db
    .from('firings')
    .select(`
      id, started_at, paused_at, restarted_at,
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

    // Nested select is ordered desc + limit 1 → [{ timestamp }] or [].
    const lastTs = firing.readings?.[0]?.timestamp ?? null

    // A just-restarted firing has only stale readings (all older than the
    // restart). Exempt it until the user logs a fresh reading.
    if (firing.restarted_at && (lastTs === null || lastTs < firing.restarted_at)) continue

    if (lastTs === null) {
      if (now - firing.started_at > NEVER_LOGGED) toAutoEnd.push(firing.id)
    } else if (now - lastTs > STALE_GAP) {
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
    // (or an app failure to log) — exactly the signal /admin/logs exists for.
    await logger.tracked('warn', 'firing.auto_ended', { userId, firingIds: toAutoEnd, count: toAutoEnd.length })
  }

  return toAutoEnd
}