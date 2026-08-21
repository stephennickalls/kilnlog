// server/utils/demoFiring.js
//
// Builds a fully-populated LIVE firing: a backdated start, readings tracking
// the plan, cone drops with realistic gaps against their Orton ratings, the
// schedule's planned atmosphere bands, and live bands that shadow them with a
// believable lag.
//
// TWO CALLERS, ONE BUILDER:
//   POST /api/demo-firing        - a user seeding a demo in their own account,
//                                  user-scoped client, RLS enforced normally.
//   POST /api/admin/demo-firing  - an admin seeding one in someone else's
//                                  account for video work, service client.
// The only difference is which client is passed in and whose user_id is used.
//
// The firing is positioned in time so that NOW sits `leadMinutes` before the
// plan reaches the GUIDE cone (the pack cone just below the target). That is
// the most demonstrable moment in a firing: a live ETA on screen, a cone about
// to fall, and an open atmosphere band to close.
//
// Readings are interpolated from the preset's own curve, so the actual line
// always hugs the plan no matter which preset is chosen. No hardcoded temps.
//
// PLANNED vs ACTUAL: preset bands are copied in with origin='planned' (the
// chart anchors those by TEMPERATURE against the plan curve) alongside
// origin='live' bands anchored by TIME. Live bands SHADOW the planned ones. An
// earlier version gave the actual reduction a fixed 35-minute length, which on
// a cone 6 reduction schedule (planned reduction runs 894C to peak, several
// hours) rendered as a four-pixel sliver beside a hatched band half the chart
// wide. That reads as "you didn't reduce", not "you reduced late".
//
// Preset oxidation bands are stored zero-width (end_temp = start_temp) as the
// current workaround for reduction_one_open_per_firing, so they render as a
// hairline until that is decided properly. Planned rows with a NULL end_temp
// are SKIPPED: an open planned band would collide with the open live band on
// the partial unique index.

const READING_INTERVAL_MIN = 15
const MIN_ELAPSED_MIN      = 120
const DROP_LAG_MIN         = 6    // cones are noticed a few minutes after due

// Live-band offsets from the plan they shadow.
const LIVE_LAG_START_MIN = 14     // you notice the temperature a few minutes late
const LIVE_LAG_END_MIN   = 32     // and you hold reduction slightly longer than planned
const MIN_LIVE_BAND_MIN  = 25     // floor, so a zero-width preset band still shows
const OPEN_TAIL_MIN      = 45     // a band ending within this of NOW is left open
const OPEN_REDUCTION_MIN = 40     // fallback open band when there is no plan to shadow

// Rotating pyrometer-vs-rating gaps. Mixed signs on purpose: a kiln that reads
// consistently high is less interesting than one that drifts.
const CONE_GAPS_C = [-9, 6, -4, 7, -6]

export const AUTO_END_HOURS_BY_FUEL_DEMO = { gas: 36, wood: 96 }

// Default recording/orientation window: how long until the guide cone is due.
export const DEMO_LEAD_MINUTES_DEFAULT = 22
export const DEMO_LEAD_MINUTES_MIN     = 5
export const DEMO_LEAD_MINUTES_MAX     = 240

// Linear interpolation of the planned curve at a given minute.
export function tempAtMinute(points, minute) {
  if (!points.length) return null
  if (minute <= points[0].offset_minutes) return points[0].target_temp
  const last = points[points.length - 1]
  if (minute >= last.offset_minutes) return last.target_temp
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (minute >= a.offset_minutes && minute <= b.offset_minutes) {
      const span = b.offset_minutes - a.offset_minutes
      if (span === 0) return b.target_temp
      return a.target_temp + (b.target_temp - a.target_temp) * (minute - a.offset_minutes) / span
    }
  }
  return null
}

// First minute at which the planned curve reaches `temp` (climbing or falling).
export function minuteAtTemp(points, temp) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const lo = Math.min(a.target_temp, b.target_temp)
    const hi = Math.max(a.target_temp, b.target_temp)
    if (temp < lo || temp > hi) continue
    const span = b.target_temp - a.target_temp
    const frac = span === 0 ? 0 : (temp - a.target_temp) / span
    return a.offset_minutes + frac * (b.offset_minutes - a.offset_minutes)
  }
  return null
}

// Deterministic wobble so a re-seed looks the same shape, not random noise.
function wobble(minute) {
  return 7 * Math.sin(minute / 41) - 4
}

// pack: cone names cold-to-hot. targetCone: the preset's `cone`.
// Returns the hottest pack cone strictly below the target, or null.
function guideCone(pack, targetCone, coneByName) {
  const targetC = coneByName.get(targetCone)?.temp_c
  if (!Number.isFinite(targetC)) return null
  let best = null
  for (const name of pack) {
    const c = coneByName.get(name)
    if (!c || !Number.isFinite(c.temp_c) || c.temp_c >= targetC) continue
    if (!best || c.temp_c > best.temp_c) best = c
  }
  return best
}

/**
 * Seeds a live demo firing. Returns a summary the caller displays.
 *
 * db          Supabase client (user-scoped or service, caller's choice)
 * userId      the account the firing is created in
 * presetId    schedule_library row to copy (points, bands, cone pack, fuel)
 * name        firing name
 * leadMinutes how long from NOW until the guide cone is due
 * isDemo      writes firings.is_demo; true for anything the user can delete
 *             as "my demo"
 */
export async function seedDemoFiring(db, {
  userId,
  presetId,
  name,
  leadMinutes = DEMO_LEAD_MINUTES_DEFAULT,
  isDemo = true,
}) {
  const { data: preset, error: pErr } = await db
    .from('schedule_library')
    .select(`
      id, name, cone, type, fuel, cone_pack,
      points:schedule_library_points(offset_minutes, target_temp),
      reductions:reduction_periods(start_temp, end_temp, kind)
    `)
    .eq('id', presetId)
    .single()

  if (pErr || !preset) throw createError({ statusCode: 404, statusMessage: 'Schedule not found' })

  const points = (preset.points ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
  if (points.length < 2) throw createError({ statusCode: 422, statusMessage: 'That schedule has no usable curve' })

  const pack = Array.isArray(preset.cone_pack) ? preset.cone_pack : []
  if (!pack.length) throw createError({ statusCode: 422, statusMessage: 'That schedule has no cone pack' })

  const { data: cones } = await db.from('cones').select('name, temp_c, sort_order').order('sort_order')
  const coneByName = new Map((cones ?? []).map(c => [c.name, c]))

  const guide = guideCone(pack, preset.cone, coneByName)
  if (!guide) throw createError({ statusCode: 422, statusMessage: 'Could not work out a guide cone for that pack' })

  const crossing = minuteAtTemp(points, guide.temp_c)
  if (crossing === null) {
    throw createError({ statusCode: 422, statusMessage: `That curve never reaches cone ${guide.name}` })
  }

  const elapsed = Math.max(MIN_ELAPSED_MIN, Math.round(crossing) - leadMinutes)
  const now     = Math.floor(Date.now() / 1000)
  const started = now - elapsed * 60
  const fuel    = preset.fuel === 'wood' ? 'wood' : 'gas'

  // The pyrometer temperature the demo would have shown at a given minute.
  const actualAt = (minute) => {
    const planned = tempAtMinute(points, minute)
    return planned === null ? null : Math.max(18, Math.round(planned + wobble(minute)))
  }

  // ── Firing row ─────────────────────────────────────────────────────────────
  const { data: firing, error: fErr } = await db
    .from('firings')
    .insert({
      user_id:        userId,
      name:           name?.trim() || preset.name,
      started_at:     started,
      fuel,
      auto_end_hours: AUTO_END_HOURS_BY_FUEL_DEMO[fuel] ?? null,
      cone_pack:      pack,
      is_demo:        !!isDemo,
    })
    .select()
    .single()

  if (fErr) {
    if (fErr.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'There is already an active firing. End it first.' })
    }
    throw await serverError('demo.firing_failed', fErr, { userId, presetId })
  }

  // Anything below this point that fails takes the firing with it, so a
  // half-seeded demo is never left behind.
  try {
    // ── Planned curve (a COPY, same as a real firing) ────────────────────────
    const { error: sErr } = await db.from('schedule').insert(
      points.map(p => ({
        firing_id:      firing.id,
        offset_minutes: p.offset_minutes,
        target_temp:    p.target_temp,
      })),
    )
    if (sErr) throw sErr

    // ── Readings ─────────────────────────────────────────────────────────────
    const readings = []
    for (let m = 0; m <= elapsed; m += READING_INTERVAL_MIN) {
      const temp = actualAt(m)
      if (temp === null) continue
      readings.push({ firing_id: firing.id, timestamp: started + m * 60, temperature: temp })
    }
    const { error: rErr } = await db.from('readings').insert(readings)
    if (rErr) throw rErr

    const lastTemp = readings.length ? readings[readings.length - 1].temperature : 20

    // ── Cone drops: every pack cone the plan has already passed ──────────────
    const drops = []
    let gapIndex = 0
    for (const coneName of pack) {
      const cone = coneByName.get(coneName)
      if (!cone || !Number.isFinite(cone.temp_c)) continue
      const min = minuteAtTemp(points, cone.temp_c)
      if (min === null || min + DROP_LAG_MIN > elapsed - 10) continue
      const gap = CONE_GAPS_C[gapIndex++ % CONE_GAPS_C.length]
      drops.push({
        firing_id:    firing.id,
        cone:         coneName,
        dropped_at:   started + Math.round(min + DROP_LAG_MIN) * 60,
        temp_at_drop: Math.round(cone.temp_c + gap),
      })
    }
    if (drops.length) {
      const { error: cErr } = await db.from('cone_drops').insert(drops)
      if (cErr) throw cErr
    }

    // ── Atmosphere: the plan, then what actually happened ────────────────────
    const bands = []

    const plannedSource = (preset.reductions ?? []).filter(
      r => r.start_temp !== null && r.end_temp !== null,
    )
    for (const r of plannedSource) {
      bands.push({
        firing_id:  firing.id,
        start_temp: r.start_temp,
        end_temp:   r.end_temp,
        kind:       r.kind === 'oxidation' ? 'oxidation' : 'reduction',
        origin:     'planned',
      })
    }

    const shadows = []
    for (const r of plannedSource) {
      const planStart = minuteAtTemp(points, r.start_temp)
      if (planStart === null) continue
      let planEnd = minuteAtTemp(points, r.end_temp)
      if (planEnd === null || planEnd <= planStart) planEnd = planStart + MIN_LIVE_BAND_MIN

      const liveStart = Math.round(planStart + LIVE_LAG_START_MIN)
      const liveEnd   = Math.round(Math.max(planEnd + LIVE_LAG_END_MIN, liveStart + MIN_LIVE_BAND_MIN))
      if (liveStart >= elapsed) continue   // hasn't happened yet in this demo

      shadows.push({
        kind: r.kind === 'oxidation' ? 'oxidation' : 'reduction',
        liveStart,
        liveEnd,
      })
    }
    shadows.sort((a, b) => a.liveStart - b.liveStart)

    // Walk newest-first so only the most recent band can be left open. The
    // partial unique index allows exactly one open period per firing.
    let openedOne = false
    for (let i = shadows.length - 1; i >= 0; i--) {
      const s = shadows[i]
      const stillOpen = !openedOne && s.liveEnd >= elapsed - OPEN_TAIL_MIN
      if (stillOpen) openedOne = true

      const endMin = Math.min(s.liveEnd, elapsed)
      bands.push({
        firing_id:  firing.id,
        start_temp: actualAt(s.liveStart) ?? lastTemp,
        end_temp:   stillOpen ? null : (actualAt(endMin) ?? lastTemp),
        kind:       s.kind,
        origin:     'live',
        created_at: started + s.liveStart * 60,
        ended_at:   stillOpen ? null : started + endMin * 60,
      })
    }

    // No plan to shadow, or nothing left open: give the demo one open band
    // anyway, because closing a reduction is one of the things to try.
    if (!openedOne) {
      bands.push({
        firing_id:  firing.id,
        start_temp: actualAt(Math.max(0, elapsed - OPEN_REDUCTION_MIN)) ?? (lastTemp - 28),
        end_temp:   null,
        kind:       'reduction',
        origin:     'live',
        created_at: now - OPEN_REDUCTION_MIN * 60,
        ended_at:   null,
      })
    }

    const { error: bErr } = await db.from('reduction_periods').insert(bands)
    if (bErr) throw bErr

    return {
      firing,
      preset:             preset.name,
      elapsedMinutes:     elapsed,
      guideCone:          guide.name,
      nextConeEtaMinutes: leadMinutes,
      readings:           readings.length,
      drops:              drops.map(d => d.cone),
      plannedBands:       plannedSource.length,
      liveBands:          bands.filter(b => b.origin === 'live').length,
      lastTemp,
    }
  } catch (err) {
    await db.from('firings').delete().eq('id', firing.id)   // children cascade
    throw await serverError('demo.seed_failed', err, { userId, presetId, firingId: firing.id })
  }
}

// Built-in presets that produce a demo worth exploring: a cone pack is what
// makes the ruler, the drop sheet and the console's next-cone line meaningful.
export async function listDemoPresets(db) {
  const { data, error } = await db
    .from('schedule_library')
    .select('id, name, type, cone, fuel, cone_pack, description')
    .is('user_id', null)
    .order('type')
    .order('name')

  if (error) throw error
  return (data ?? []).filter(p => (p.cone_pack ?? []).length)
}