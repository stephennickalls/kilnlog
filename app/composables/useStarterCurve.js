// app/composables/useStarterCurve.js
//
// THE ONLY PLACE A FIRING CURVE IS INVENTED.
//
// Before this there were three, all drifting: BISQUE_POINTS/GLAZE_POINTS in
// StartFiringModal, BISQUE_DEFAULT in schedules/new, and QUICK_STARTS in
// ScheduleSegmentEditor. Six curves, three files, no two agreeing. The seeded
// starter schedules (migrations/20260819_starter_schedules.sql) are a fourth
// copy — that one is deliberate, since they are rows a user can edit, and the
// migration generates its points from these same profiles. Retune one, retune
// both.
//
// A schedule is two independent decisions. TYPE decides the SHAPE: how
// cautiously you climb, where you hold, where you slow down, whether the kiln
// cools under control or gets opened. CONE decides the PEAK: one number.
// Neither implies the other, which is why buildStarterCurve takes both and why
// selection order is irrelevant — every rebuild reads the current value of each.
//
// Profiles are SEGMENTS (rate / target / hold), not waypoints, because that is
// the unit the shape is actually reasoned in ("slow through quartz inversion"
// is a rate, not a minute offset) and because segmentsToPoints already does the
// arithmetic. `to` is either a number — an absolute °C landmark that does not
// move with the peak, like the 573°C quartz inversion — or a function of the
// peak, for landmarks that do.
//
// THREE THINGS THAT ARE EASY TO LEAVE OUT AND SHOULDN'T BE:
//
//   PREHEAT HOLD. Every controller has a preheat step and most potters use it.
//   Free water that hasn't left by ~100°C flashes to steam and blows the pot
//   apart. 30 minutes is the conservative default here; thick or recently
//   thrown work wants one to three hours, which is a user edit.
//
//   SLOW FINAL RAMP. Cones measure heat WORK — time at temperature, not peak
//   temperature. Easing the last stretch is what evens that out across the
//   load instead of over-firing the top shelf and under-firing the bottom.
//
//   FIRE-DOWN. The controlled cool below peak is where glaze crystals grow.
//   Skip it and mattes come out dry and thin. This is standard practice for
//   mid-fire electric work and it is the single biggest omission a generated
//   glaze curve can have. It is also the most expensive: it adds ~6 hours. Cone
//   10 reduction potters typically delete those two segments and let the kiln
//   free-fall — that is a two-tap edit, whereas discovering you needed a fire-
//   down after unloading is a wasted firing.
//
// NOT A RECOMMENDATION. Scaffolding to get someone off a blank grid with
// something conventional and safe. Clay body, kiln and load all move the right
// answer; the potter is expected to edit.

import { segmentsToPoints } from '~/composables/useCurveSegments'
import { labelForType } from '~/composables/useScheduleTheme'

const AMBIENT = 20

// Where the cone select lands when a type is picked and no cone is set yet.
// Bisque 06 and raku 06 are near-universal. Cone 6 wins over 10 as the blind
// glaze default because it is the common electric target.
export const DEFAULT_CONE = {
  bisque:      '06',
  glaze:       '6',
  single_fire: '6',
  raku:        '06',
  other:       '06',
}

// Only used when the cone is unknown or unrated, so the curve is still real.
const FALLBACK_PEAK = {
  bisque:      999,
  glaze:       1222,
  single_fire: 1222,
  raku:        999,
  other:       1000,
}

const PROFILES = {
  // Raw clay. Everything below 600°C is patience. Free water out during the
  // 100°C hold, chemical water and organics out through the 200-600°C band,
  // and the 573°C quartz inversion crossed slowly enough not to crack. Above
  // that the ware is stable and can move. No fire-down: there is no glaze to
  // develop, and the kiln's own fall is gentle enough.
  bisque: {
    ramps: [
      { rate: 60,  to: 100, hold: 30 },
      { rate: 100, to: 600 },
    ],
    peak: { rate: 150, hold: 10 },
    cool: [
      { rate: 150, to: 600 },
      { rate: 80,  to: 200 },
    ],
  },

  // Bisqued ware has nothing left to burn out, so the low end is only a
  // preheat that dries the applied glaze. Then a fast working ramp, a slow
  // final ramp for even heat work, a crash out of the melt so the glaze stops
  // moving, and the fire-down through the crystal-growth window.
  glaze: {
    ramps: [
      { rate: 100, to: 200 },
      { rate: 200, to: p => p - 122 },
    ],
    peak: { rate: 60, hold: 15 },
    cool: [
      { rate: 300, to: p => p - 142 },   // crash out of the melt
      { rate: 55,  to: p => p - 462 },   // FIRE-DOWN — crystal growth
      { rate: 90,  to: 200 },            // free fall
    ],
  },

  // Glaze on greenware: it has to survive every bisque hazard AND reach glaze
  // temperature. The glaze layer makes it harder for water vapour to escape,
  // so the preheat is longer and the climb to 600°C slower than either parent.
  single_fire: {
    ramps: [
      { rate: 50,  to: 100, hold: 60 },
      { rate: 80,  to: 600 },
      { rate: 200, to: p => p - 122 },
    ],
    peak: { rate: 60, hold: 15 },
    cool: [
      { rate: 300, to: p => p - 142 },
      { rate: 55,  to: p => p - 462 },
      { rate: 90,  to: 200 },
    ],
  },

  // Raku is the opposite firing. Fast on purpose, ware goes in and comes out
  // hot, and the interesting part happens in the reduction chamber rather than
  // the kiln. The steep final leg is not the kiln cooling — it is the lid
  // coming off and the piece being pulled, which is why it ends where it does
  // rather than at a temperature you could unload at.
  raku: {
    ramps: [
      { rate: 250, to: 600 },
    ],
    peak: { rate: 300, hold: 10 },
    cool: [
      { rate: 900, to: 200 },
    ],
  },

  // No opinion to express: one ramp, a short hold, a plain cool.
  other: {
    ramps: [],
    peak: { rate: 150, hold: 10 },
    cool: [
      { rate: 120, to: 200 },
    ],
  },
}

function resolve(to, peak) {
  return Math.round(typeof to === 'function' ? to(peak) : to)
}

// A cone's rating, or the type's fallback. Never a guess: an unrated cone
// falls back to the type default, because a wrong peak is worse than a
// generic one.
export function peakForCone(type, coneTempC) {
  const t = Number(coneTempC)
  if (Number.isFinite(t) && t > AMBIENT) return Math.round(t)
  return FALLBACK_PEAK[type] ?? FALLBACK_PEAK.other
}

// Returns { ambient, segments } — the shape ScheduleSegmentEditor works in.
export function buildStarterSegments(type, peakC) {
  const profile = PROFILES[type] ?? PROFILES.other
  let peak = Math.round(Number(peakC))
  if (!Number.isFinite(peak) || peak <= AMBIENT + 40) peak = FALLBACK_PEAK[type] ?? FALLBACK_PEAK.other

  const segments = []
  let running = AMBIENT

  // Every intermediate ramp must sit strictly between where we are and the
  // peak, or it is not a step. A cone 022 bisque peaks at 586°C, below the
  // 600°C landmark — without this guard the curve ramps up past its own peak
  // and then back down to it.
  for (const r of profile.ramps) {
    const to = Math.min(resolve(r.to, peak), peak - 20)
    if (to <= running) continue
    segments.push({ rate: r.rate, target: to, hold: r.hold ?? 0 })
    running = to
  }

  segments.push({ rate: profile.peak.rate, target: peak, hold: profile.peak.hold })
  running = peak

  // Same guard downward: a cool landmark computed off a low peak can land
  // above where we already are, or below the 200°C floor. A low-fire schedule
  // therefore drops fire-down segments on its own rather than producing a
  // crystal-growth soak that would sit below quartz inversion.
  for (const c of profile.cool) {
    const to = Math.max(resolve(c.to, peak), 200)
    if (to >= running) continue
    segments.push({ rate: c.rate, target: to, hold: 0 })
    running = to
  }

  return { ambient: AMBIENT, segments }
}

// Returns [{ offsetMinutes, targetTemp }] in °C — the stored model.
export function buildStarterCurve(type, peakC) {
  const { ambient, segments } = buildStarterSegments(type, peakC)
  return segmentsToPoints(ambient, segments, 0)
}

export function curveLabel(type, cone) {
  return `${labelForType(type)}${cone ? ` · cone ${cone}` : ''}`
}

// The Steps table's quick-start buttons. Peaks are inlined rather than looked
// up because that component has no cones fetch and these are fixed labels —
// but they run through the same profiles, so a quick start and a type+cone
// pick give the same curve.
export const QUICK_STARTS = [
  { label: 'Bisque · cone 06', type: 'bisque', peak: 999  },
  { label: 'Glaze · cone 6',   type: 'glaze',  peak: 1222 },
  { label: 'Raku · cone 06',   type: 'raku',   peak: 999  },
]

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-REBUILD
//
// Shared by /schedules/new and /schedules/[id], which are documented as
// near-twins that must stay in step — so the rule lives here rather than being
// written twice.
//
// The whole problem is knowing when a rebuild is welcome. On a new blank
// schedule the curve on screen is machine-made and nobody minds it being
// replaced. On an existing schedule it is somebody's saved work, and silently
// regenerating it because they corrected the type dropdown is destroying data
// to be helpful.
//
// So `generated` tracks whether the points are still untouched machine output.
// True → rebuild silently. False → raise `offer` and let the user press the
// button. Call markEdited() from the curve editor's change handler, and
// adopt() whenever points arrive from anywhere real: a loaded schedule, a
// library seed, a past firing's readings.
export function useAutoCurve(form, points, opts = {}) {
  const { loaded, tempFor } = useCones()

  const generated = ref(opts.generated ?? true)
  const offer     = ref(false)

  // Set while we mutate form.cone ourselves, so filling in a default does not
  // re-enter the watcher. Cleared on nextTick, which lands after the watcher
  // job for the assignment that set it.
  let skip = false

  const label = computed(() => curveLabel(form.type, form.cone))

  function rebuild() {
    if (!form.cone && DEFAULT_CONE[form.type]) {
      skip = true
      form.cone = DEFAULT_CONE[form.type]
      nextTick(() => { skip = false })
    }
    points.value    = buildStarterCurve(form.type, peakForCone(form.type, tempFor(form.cone)))
    generated.value = true
    offer.value     = false
  }

  // Order-independent: reads both values every time, so whichever the user
  // changes, the other is whatever it currently is.
  watch(() => [form.type, form.cone], () => {
    if (skip || !form.type) return
    if (generated.value) rebuild()
    else offer.value = true
  })

  // /api/cones resolves after mount, so a cone set before it lands had no
  // temperature and the first curve used a type fallback. Redo it once the
  // real number exists — but only if nobody has touched the curve since.
  watch(loaded, (v) => { if (v && generated.value) rebuild() })

  // The points on screen are now somebody's, not ours.
  function adopt() {
    generated.value = false
    offer.value     = false
    skip            = true
    nextTick(() => { skip = false })
  }

  function markEdited() {
    generated.value = false
    offer.value     = false
  }

  function dismissOffer() {
    offer.value = false
  }

  return { generated, offer, label, rebuild, adopt, markEdited, dismissOffer }
}