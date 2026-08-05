// File: server/api/bootstrap.get.js
//
// GET /api/bootstrap — everything /app needs on first paint, in ONE function
// invocation. Replaces the old serial trio on mount:
//   /api/preferences → /api/firings → /api/firings/:id
// which cost 3 Netlify invocations × (auth + profile + query) round trips.
//
// Returns:
//   {
//     temp_unit:          'C' | 'F',
//     firings:            [...],          // FIRST PAGE only, newest first
//     activeFiring:       {...} | null,   // full detail: schedule+readings+reductions+cone_drops
//     role:               'admin' | 'user',
//     pastDueGraceEndsAt: ISO string | null,
//     announcements:      [...],
//   }
//
// Round-trip plan inside the function (Supabase queries) — TWO rounds:
//   1. Promise.all: preferences + auto-end sweep + announcements + dismissals
//   2. Promise.all: firings page + active-firing detail (nested select)
//
// PERF (Aug 2026): round 2 used to be two SERIAL rounds — fetch the active
// firing's id, then re-query that row for its detail. Since the sweep in
// round 1 has already ended anything stale, the nested select can filter on
// the same predicate directly, saving a full DB round trip on every load.
//
// LAZY LIST (Aug 2026): `firings` is now the FIRST PAGE (FIRINGS_PAGE_SIZE
// rows, list columns only) rather than every firing ever created. The sidebar
// loads older pages on demand via GET /api/firings?offset=. The ACTIVE firing
// is the deliberate exception — it's still returned in full, because the chart
// needs its readings on first paint and there's nothing to lazy-load them for.
//
// The active firing might not be on page 1: restarting an old firing makes it
// active again without changing created_at. That's fine — it comes back in
// `activeFiring` regardless of the page, and app.vue merges it into the list
// so its "Live" row is always present.
//
// CONE DROPS (Aug 2026): active-firing detail nested-selects cone_drops so
// the chart can draw drop markers on first paint, same pattern as reductions.
//
// ROLE + G8 GRACE (Aug 2026): useServerUser already fetched the profiles row
// to enforce the subscription gate, so passing role and the past_due grace
// deadline through costs zero extra queries. This let us DELETE the
// browser→Supabase profiles queries in UserMenu, PastDueBanner, and the auth
// middleware — and PastDueBanner's auth.getUser() network call with them.
// PAST_DUE_GRACE_DAYS now lives in exactly one file (useServerUser.js).
//
// TIMING (Aug 2026, temporary): bootstrap.timing splits cold-start cost into
// auth (JWKS fetch + JWT verify + profile query) vs the two query rounds, so
// we can tell whether remaining slowness is the JWKS network call or
// Netlify↔Supabase region latency. Remove once the numbers are understood.
//
// requireSubscription stays true — /app is a paid surface, same as the routes
// this replaces (preferences was requireSubscription:false, but it's bundled
// here only for the paid page; /api/preferences still exists for other pages).
// NOTE: past_due-within-grace PASSES the subscription gate (hasAccess), so
// this endpoint still runs for those users — the banner data is reachable.

import { PAST_DUE_GRACE_DAYS } from '../utils/useServerUser'

export default defineEventHandler(async (event) => {
  const t0 = Date.now()

  const { db, user, profile } = await useServerUser(event)

  const tAuth = Date.now()

  // ── Round 1: preferences + staleness sweep + announcements, in parallel ──
  const nowIso = new Date().toISOString()
  const [prefsRes, , annRes, disRes] = await Promise.all([
    db.from('preferences').select('temp_unit').eq('user_id', user.id).maybeSingle(),
    autoEndStale(db, user.id),   // may end stale firings before we list them
    // ANNOUNCEMENTS: live-window banners…
    db.from('announcements').select('id, title, message, link_url, created_at')
      .eq('active', true).lte('starts_at', nowIso).gte('ends_at', nowIso),
    // …minus what this user has already dismissed.
    db.from('announcement_dismissals').select('announcement_id').eq('user_id', user.id),
  ])

  if (prefsRes.error) {
    throw await serverError('bootstrap.prefs_failed', prefsRes.error, { userId: user.id })
  }

  const tRound1 = Date.now()

  // ── Round 2: first page + active-firing detail, in ONE parallel round ────
  // The sweep (round 1) has already ended anything stale, so filtering on
  // "started and not ended" here is safe. The partial unique index
  // one_active_firing_per_user keeps this a single-row lookup.
  //
  // Ordering mirrors /api/firings exactly (created_at DESC, id DESC) — page 1
  // here and page 2 there must come from the same sort or rows go missing.
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
        reductions:reduction_periods(id, start_temp, end_temp, created_at, ended_at, origin),
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

  // Nested rows aren't guaranteed ordered — sort after the fetch (same as
  // /api/firings/:id).
  const activeFiring = activeRes.data ?? null
  if (activeFiring) {
    activeFiring.schedule   = (activeFiring.schedule ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
    activeFiring.readings   = (activeFiring.readings ?? []).sort((a, b) => a.timestamp - b.timestamp)
    activeFiring.reductions = (activeFiring.reductions ?? []).sort((a, b) => a.created_at - b.created_at)
    activeFiring.cone_drops = (activeFiring.cone_drops ?? []).sort((a, b) => a.dropped_at - b.dropped_at)
  }

  // TIMING (temporary): cold starts pay the JWKS fetch + an empty profile
  // cache inside useServerUser — authMs isolates that from query latency.
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
    // ROLE (Aug 2026): server-verified, from the profile useServerUser
    // already loaded. Zero extra queries. Feeds UserMenu's Admin link.
    role: profile.role ?? 'user',
    // G8 (Aug 2026): past_due grace deadline, computed here so PastDueBanner
    // is purely presentational. Mirrors hasAccess(): no last_stripe_event_at
    // anchor → anchor on now (Stripe will reconcile shortly). null unless
    // the user is actually past_due.
    pastDueGraceEndsAt: profile.subscription_status === 'past_due'
      ? new Date(
          (profile.last_stripe_event_at ? new Date(profile.last_stripe_event_at) : new Date()).getTime()
          + PAST_DUE_GRACE_DAYS * 86400000
        ).toISOString()
      : null,
    // ANNOUNCEMENTS: live and not yet dismissed by this user. Query failures
    // here must not break bootstrap — banners are best-effort.
    announcements: (() => {
      const dismissed = new Set((disRes?.data ?? []).map(d => d.announcement_id))
      return (annRes?.data ?? []).filter(a => !dismissed.has(a.id))
    })(),
  }
})