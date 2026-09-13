// File: server/utils/autoEndStale.js
//
// Auto-end sweep, shared by GET /api/firings and GET /api/bootstrap.
//
// THRESHOLD HISTORY (each bump because a real firing got closed under a user):
//   2h/1h -> 12h (Jul/Aug 2026) -> per-firing, Aug 2026 (cone-first rebuild).
// The limit is DATA, not a constant: firings.auto_end_hours, set at creation
// from the fuel (gas 36h, wood 96h). NULL falls back to AUTO_END_DEFAULT_HOURS,
// covering every firing created before the column existed.
//
// Rules:
//   Auto-end an active firing when:
//     - No readings for its limit, OR
//     - Started but never had a reading, and started longer ago than its limit.
//   EXEMPT:
//     - Paused firings (paused_at set).
//     - Just-restarted firings whose only readings predate the restart.
//
// ANY UI THAT STATES THE THRESHOLD MUST READ firing.auto_end_hours.
//
// PERF: fetches only the LATEST reading timestamp per firing (ordered nested
// select, limit 1). PostgREST aggregates are disabled on Supabase.
//
// SEP 2026: the active-firings select is wrapped in withRetry after a single
// Gateway Timeout on 14 Sep took down GET /api/firings for one request.
//
// Returns the array of firing ids that were auto-ended (possibly empty).

export const AUTO_END_DEFAULT_HOURS = 24
export const AUTO_END_HOURS_BY_FUEL = { gas: 36, wood: 96 }

export function autoEndLimitSeconds(firing) {
  const hours = Number(firing?.auto_end_hours)
  return (Number.isFinite(hours) && hours > 0 ? hours : AUTO_END_DEFAULT_HOURS) * 3600
}

export async function autoEndStale(db, userId) {
  const { data: activeFirings, error } = await withRetry(() =>
    db
      .from('firings')
      .select(`
        id, started_at, paused_at, restarted_at, auto_end_hours,
        readings:readings(timestamp)
      `)
      .eq('user_id', userId)
      .is('ended_at', null)
      .not('started_at', 'is', null)
      .order('timestamp', { referencedTable: 'readings', ascending: false })
      .limit(1, { referencedTable: 'readings' }))

  if (error) throw await serverError('firings.autoend.query_failed', error, { userId })

  const now = Math.floor(Date.now() / 1000)
  const toAutoEnd = []

  for (const firing of activeFirings ?? []) {
    if (firing.paused_at) continue

    const lastTs = firing.readings?.[0]?.timestamp ?? null

    if (firing.restarted_at && (lastTs === null || lastTs < firing.restarted_at)) continue

    const limit = autoEndLimitSeconds(firing)

    if (lastTs === null) {
      if (now - firing.started_at > limit) toAutoEnd.push(firing.id)
    } else if (now - lastTs > limit) {
      toAutoEnd.push(firing.id)
    }
  }

  if (toAutoEnd.length) {
    const { error: endErr } = await withRetry(() =>
      db
        .from('firings')
        .update({ ended_at: now, auto_ended: true })
        .in('id', toAutoEnd)
        .eq('user_id', userId))

    if (endErr) throw await serverError('firings.autoend.update_failed', endErr, { userId, toAutoEnd })

    await logger.tracked('warn', 'firing.auto_ended', { userId, firingIds: toAutoEnd, count: toAutoEnd.length })
  }

  return toAutoEnd
}