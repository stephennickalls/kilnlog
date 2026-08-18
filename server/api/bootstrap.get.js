// File: server/api/bootstrap.get.js
//
// GET /api/bootstrap — everything /app needs on first paint, in ONE function
// invocation, over two parallel query rounds.
//
// Returns: { temp_unit, firings (first page, list columns), activeFiring
// (full detail), cones, role, pastDueGraceEndsAt, announcements }
//
// The active firing is returned in full even if it isn't on page 1 (restarting
// an old firing makes it active without changing created_at); app.vue merges it
// into the list so its Live row is always present.

import { PAST_DUE_GRACE_DAYS } from '../utils/useServerUser'

export default defineEventHandler(async (event) => {
  const t0 = Date.now()

  const { db, user, profile } = await useServerUser(event)

  const tAuth = Date.now()

  // ── Round 1: preferences + staleness sweep + announcements + cones ──────
  const nowIso = new Date().toISOString()
  const [prefsRes, , annRes, disRes, conesRes] = await Promise.all([
    db.from('preferences').select('temp_unit').eq('user_id', user.id).maybeSingle(),
    autoEndStale(db, user.id),   // may end stale firings before we list them
    db.from('announcements').select('id, title, message, link_url, created_at')
      .eq('active', true).lte('starts_at', nowIso).gte('ends_at', nowIso),
    db.from('announcement_dismissals').select('announcement_id').eq('user_id', user.id),
    // CONE-FIRST: the chart's cone ruler and the console's next-cone readout
    // both need temp_c on first paint, so it rides along here rather than
    // costing a separate round trip after mount.
    db.from('cones').select('id, name, sort_order, temp_c').order('sort_order', { ascending: true }),
  ])

  if (prefsRes.error) {
    throw await serverError('bootstrap.prefs_failed', prefsRes.error, { userId: user.id })
  }

  const tRound1 = Date.now()

  // ── Round 2: first page + active-firing detail, in ONE parallel round ────
  // The sweep has already ended anything stale, so filtering on "started and
  // not ended" is safe. Ordering must mirror /api/firings exactly (created_at
  // DESC, id DESC) — page 1 here and page 2 there come from the same sort or
  // rows go missing.
  const [listRes, activeRes] = await Promise.all([
    db.from('firings')
      .select(FIRING_LIST_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, FIRINGS_PAGE_SIZE - 1),
    db.from('firings')
      .select(`
        *,
        schedule:schedule(*),
        readings:readings(${READING_COLUMNS}),
        reductions:reduction_periods(id, start_temp, end_temp, created_at, ended_at, origin, kind),
        cone_drops:cone_drops(id, cone, dropped_at, temp_at_drop)
      `)
      .eq('user_id', user.id)
      .is('ended_at', null)
      .not('started_at', 'is', null)
      .maybeSingle(),
  ])

  if (listRes.error) {
    throw await serverError('bootstrap.list_failed', listRes.error, { userId: user.id })
  }
  if (activeRes.error) {
    throw await serverError('bootstrap.active_detail_failed', activeRes.error, { userId: user.id })
  }

  // Nested rows aren't guaranteed ordered — sort after the fetch.
  const activeFiring = activeRes.data ?? null
  if (activeFiring) {
    activeFiring.schedule   = (activeFiring.schedule ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
    activeFiring.readings   = (activeFiring.readings ?? []).sort((a, b) => a.timestamp - b.timestamp)
    activeFiring.reductions = (activeFiring.reductions ?? []).sort((a, b) => a.created_at - b.created_at)
    activeFiring.cone_drops = (activeFiring.cone_drops ?? []).sort((a, b) => a.dropped_at - b.dropped_at)
  }

  logger.info('bootstrap.timing', {
    userId:  user.id,
    authMs:  tAuth - t0,
    round1Ms: tRound1 - tAuth,
    round2Ms: Date.now() - tRound1,
    totalMs: Date.now() - t0,
    firingsPage: (listRes.data ?? []).length,
    activeReadings: activeFiring?.readings?.length ?? 0,
  })

  return {
    temp_unit: prefsRes.data?.temp_unit ?? 'C',
    firings:   listRes.data ?? [],
    activeFiring,
    // Best-effort like announcements: a cone query failure costs the ruler,
    // not the page. app.vue's lazy /api/cones fetch remains the fallback.
    cones: conesRes?.data ?? [],
    role: profile.role ?? 'user',
    // Mirrors hasAccess(): no last_stripe_event_at anchor means anchor on now.
    // null unless the user is actually past_due.
    pastDueGraceEndsAt: profile.subscription_status === 'past_due'
      ? new Date(
          (profile.last_stripe_event_at ? new Date(profile.last_stripe_event_at) : new Date()).getTime()
          + PAST_DUE_GRACE_DAYS * 86400000
        ).toISOString()
      : null,
    announcements: (() => {
      const dismissed = new Set((disRes?.data ?? []).map(d => d.announcement_id))
      return (annRes?.data ?? []).filter(a => !dismissed.has(a.id))
    })(),
  }
})