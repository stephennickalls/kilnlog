// File: server/api/bootstrap.get.js
//
// GET /api/bootstrap — everything /app needs on first paint, in ONE function
// invocation. Replaces the old serial trio on mount:
//   /api/preferences → /api/firings → /api/firings/:id
// which cost 3 Netlify invocations × (auth + profile + query) round trips.
//
// Returns:
//   {
//     temp_unit:    'C' | 'F',
//     firings:      [...],          // all firings, newest first (list shape)
//     activeFiring: {...} | null,   // full detail: schedule+readings+reductions+cone_drops
//   }
//
// Round-trip plan inside the function (Supabase queries):
//   1. Promise.all: preferences + auto-end sweep (which itself is 1 query,
//      +1 update only when something is actually stale)
//   2. Promise.all: firings list + active-firing detail (active id is known
//      from the sweep's own query of active firings)
//
// CONE DROPS (Aug 2026): active-firing detail now nested-selects cone_drops so
// the chart can draw drop markers on first paint, same pattern as reductions.
//
// requireSubscription stays true — /app is a paid surface, same as the routes
// this replaces (preferences was requireSubscription:false, but it's bundled
// here only for the paid page; /api/preferences still exists for other pages).

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  // ── Step 1: preferences + staleness sweep + announcements, in parallel ────
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

  // ── Step 2: full list + (if any) active firing detail, in parallel ────────
  // The active firing must be re-derived AFTER the sweep (a stale one may have
  // just been ended), so we query the list first and find active from it — but
  // to keep this to one parallel round instead of two serial ones, we fetch
  // the active id with a cheap indexed query alongside the list. The partial
  // unique index one_active_firing_per_user makes this a single-row lookup.
  const [listRes, activeRowRes] = await Promise.all([
    db.from('firings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    db.from('firings').select('id').eq('user_id', user.id).is('ended_at', null).not('started_at', 'is', null).maybeSingle(),
  ])

  if (listRes.error) {
    throw await serverError('bootstrap.list_failed', listRes.error, { userId: user.id })
  }

  // ── Step 3: active detail (only when a firing is live) ────────────────────
  let activeFiring = null
  const activeId = activeRowRes.data?.id ?? null
  if (activeId) {
    const { data, error } = await db
      .from('firings')
      .select(`
        *,
        schedule:schedule(*),
        readings:readings(*),
        reductions:reduction_periods(id, start_temp, end_temp, created_at, ended_at, origin),
        cone_drops:cone_drops(id, cone, dropped_at, temp_at_drop)
      `)
      .eq('id', activeId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      throw await serverError('bootstrap.active_detail_failed', error, { userId: user.id, activeId })
    }

    // Nested rows aren't guaranteed ordered — sort after the single fetch
    // (same as /api/firings/:id).
    data.schedule   = (data.schedule ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
    data.readings   = (data.readings ?? []).sort((a, b) => a.timestamp - b.timestamp)
    data.reductions = (data.reductions ?? []).sort((a, b) => a.created_at - b.created_at)
    data.cone_drops = (data.cone_drops ?? []).sort((a, b) => a.dropped_at - b.dropped_at)
    activeFiring = data
  }

  return {
    temp_unit: prefsRes.data?.temp_unit ?? 'C',
    firings:   listRes.data ?? [],
    activeFiring,
    // ANNOUNCEMENTS: live and not yet dismissed by this user. Query failures
    // here must not break bootstrap — banners are best-effort.
    announcements: (() => {
      const dismissed = new Set((disRes?.data ?? []).map(d => d.announcement_id))
      return (annRes?.data ?? []).filter(a => !dismissed.has(a.id))
    })(),
  }
})