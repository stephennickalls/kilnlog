// File: app/composables/useFiringZones.js
//
// Reference temperature zones drawn behind the chart ("key events overlay"),
// AND the landmark temperatures the starter curves slow down over. Those two
// have to be the same numbers or the app contradicts itself on screen: a band
// labelled "ease through here" with a generated curve sailing straight through
// it is worse than no band at all. useStarterCurve imports them from here.
//
// WHY CONSTANTS AND NOT A TABLE: they are physics, not user data and not
// configuration. A table would buy tuning by UPDATE, at the cost of a
// migration, an RLS policy, an endpoint and a network round trip on every
// chart. If a number here is wrong, it is a one-line deploy.
//
// TEMPERATURES ARE ALWAYS °C. min is always the LOWER number, even for the
// zones that matter on the way down.
//
// RANGES ARE PRACTICE, NOT PHYSICS. The first version used the textbook
// figures and they were useless: quartz inversion is a knife-edge at 573°C,
// which renders as a 4px sliver, and nobody fires to a knife-edge anyway — the
// whole approach gets eased through. Each zone is the range a potter actually
// slows down over, which is both more useful and wide enough to read.
//
// BODY REDUCTION WAS REMOVED. It sat at 1010-1100 while a tester's own planned
// reduction started at 894 (cone 010), so the app contradicted the user's own
// plan with a number presented as reference. Reduction timing varies by
// tradition and clay body, and reduction_periods already lets people state
// their intent — a fixed band competing with that is worse than none.
//
// TONE is the colour category, deliberately about CONSEQUENCE rather than
// subject: 'crack' is where you lose work, 'glaze' is glaze behaviour,
// 'process' is something happening with nothing at stake.
//
// SHORT is the phone label. Zone labels used to be full width across the band,
// where "Cristobalite inversion" had the whole chart to sit in. They are now
// chips above a box that can be 16px wide, and on a 460px phone chart the full
// names collide with each other and with the curve. `short` is the same fact
// in as few characters as it survives being cut to - never an abbreviation
// nobody says out loud, which is why it is 'Quartz 573' and not 'QI'.
//
// ── LEG (Sep 2026) ─────────────────────────────────────────────────────────
//
// Every zone now declares which DIRECTION of travel it matters in, and the
// chart clips the band to the stretches of curve going that way. Before this
// they were full-width horizontal stripes, which claimed every zone applied
// for the whole firing. That was flatly wrong for half of them: cristobalite
// contracts on the way DOWN, and a stripe across the chart said it also
// mattered on the climb.
//
// The `note` used to carry the direction in words. It no longer has to, and
// should not: a sentence saying "on the way down" under a band drawn across
// the whole width is the app apologising for its own drawing.
//
// TWO GLAZE EVENTS, NOT ONE. "Glaze seal" used to mean the melt going solid on
// the descent, which is a real thing but is the SET point. The glaze also
// SEALS on the ascent — the temperature above which it is no longer gas
// permeable, so anything still off-gassing from the body is trapped and
// surfaces as pinholes or blisters. A high-boron glaze can seal from around
// 790°C, others closer to 1000°C. They are opposite legs, opposite advice, and
// sharing a name made both unreadable. Sources: glaze sealing temperature is
// defined as the point above which the glaze is not gas permeable; late
// gassers overlapping early melters is the documented cause of pinholing
// (Digitalfire).

// The two inversions, as ranges. Exported because the starter curve profiles
// build their slow segments to exactly these edges.
export const QUARTZ_LO = 540
export const QUARTZ_HI = 610
export const CRISTOBALITE_LO = 200
export const CRISTOBALITE_HI = 280

const BISQUE_MAX_C = 1150

const ZONES = {
  bisque: [
    {
      label: 'Water smoking',
      short: 'Water',
      min: 20, max: 120,
      leg: 'heating',
      tone: 'process',
      note: 'Free water leaving. Thick work needs this slow or it will burst.',
    },
    {
      label: 'Organic burnout',
      short: 'Burnout',
      min: 300, max: 800,
      leg: 'heating',
      tone: 'process',
      note: 'Carbon and sulphur oxidising out. Starve it of air here and you risk black coring.',
    },
    {
      label: 'Quartz inversion',
      short: 'Quartz 573',
      min: QUARTZ_LO, max: QUARTZ_HI,
      leg: 'both',
      tone: 'crack',
      note: 'Silica jumps about 1% in volume at 573°C. Ease through the whole range.',
    },
    {
      label: 'Cristobalite inversion',
      short: 'Cristobalite',
      min: CRISTOBALITE_LO, max: CRISTOBALITE_HI,
      leg: 'cooling',
      tone: 'crack',
      note: 'The dunting zone. Cooling fast through here cracks finished work overnight.',
    },
  ],
  glaze: [
    {
      label: 'Quartz inversion',
      short: 'Quartz 573',
      min: QUARTZ_LO, max: QUARTZ_HI,
      leg: 'both',
      tone: 'crack',
      note: 'Silica jumps about 1% in volume at 573°C. Ease through the whole range.',
    },
    {
      // The ASCENT event: the glaze closes over and stops being gas permeable.
      label: 'Glaze seals',
      short: 'Seals',
      min: 800, max: 1000,
      leg: 'heating',
      tone: 'glaze',
      note: 'The glaze stops being gas permeable. Anything still gassing from the body is trapped, and surfaces as pinholes.',
    },
    {
      // The DESCENT event: the melt freezes.
      label: 'Glaze sets',
      short: 'Sets',
      min: 700, max: 800,
      leg: 'cooling',
      tone: 'glaze',
      note: 'The melt goes solid. Opening the kiln above this crazes.',
    },
    {
      label: 'Cristobalite inversion',
      short: 'Cristobalite',
      min: CRISTOBALITE_LO, max: CRISTOBALITE_HI,
      leg: 'cooling',
      tone: 'crack',
      note: 'The dunting zone. Cooling fast through here cracks finished work overnight.',
    },
  ],
}

// ── Clipping a zone to time ──────────────────────────────────────────────────
// Given a curve as [{ x: minutes, y: °C }], returns the stretches that lie
// inside [lo, hi] while travelling in `leg`. Each stretch reports the
// temperature range ACTUALLY covered, so a plan that peaks inside a zone gets a
// box that stops at the peak rather than one floating above the curve.
//
// A FLAT SEGMENT INHERITS the direction of the segment before it. A hold is not
// a third direction: a 30 minute soak on the way up is part of the climb, and a
// drop-and-hold's soak below peak is part of the descent. This is why a bisque's
// two hour candle at 90°C shows up inside the water-smoking box rather than
// punching a hole in it.
//
// Shared by useKilnChart (canvas) and PrintCurve (SVG). It lives here rather
// than in either of them because the two drew different overlays for a while
// and the print sheet ended up contradicting the screen.
export function spansIn(points, lo, hi, leg = 'both') {
  const curve = (points ?? []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
  if (curve.length < 2) return []

  const raw = []
  let lastDir = 'heating'

  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1]

    let dir = b.y > a.y ? 'heating' : b.y < a.y ? 'cooling' : 'flat'
    if (dir === 'flat') dir = lastDir
    else lastDir = dir
    if (leg !== 'both' && dir !== leg) continue

    const yLo = Math.max(Math.min(a.y, b.y), lo)
    const yHi = Math.min(Math.max(a.y, b.y), hi)
    if (yHi < yLo) continue                       // never enters the zone

    let x0, x1
    if (a.y === b.y) {
      x0 = a.x; x1 = b.x                          // a hold inside the zone
    } else {
      const at = v => a.x + ((v - a.y) / (b.y - a.y)) * (b.x - a.x)
      const xA = at(yLo), xB = at(yHi)
      x0 = Math.min(xA, xB); x1 = Math.max(xA, xB)
    }
    raw.push({ x0, x1, yLo, yHi, dir })
  }

  // Consecutive segments produce touching stretches; merge them so a climb
  // through the zone is one box rather than one box per ramp.
  raw.sort((p, q) => p.x0 - q.x0)
  const out = []
  for (const s of raw) {
    const last = out[out.length - 1]
    if (last && last.dir === s.dir && s.x0 <= last.x1 + 1e-6) {
      last.x1  = Math.max(last.x1, s.x1)
      last.yLo = Math.min(last.yLo, s.yLo)
      last.yHi = Math.max(last.yHi, s.yHi)
    } else {
      out.push({ ...s })
    }
  }
  return out
}

// Every zone in the set, clipped to the stretches of `curve` where it applies.
// Returns [{ ...zone, x0, x1, yLo, yHi, dir }] — one entry PER CROSSING, so a
// both-legs zone on a schedule with a controlled cool appears twice.
export function zoneBoxesFor(curve, zones) {
  const out = []
  for (const zone of zones ?? []) {
    for (const span of spansIn(curve, zone.min, zone.max, zone.leg ?? 'both')) {
      out.push({ ...zone, ...span })
    }
  }
  return out
}

export function useFiringZones() {
  // peakC is the highest temperature on either curve. A firing with no plan and
  // no readings yet has no peak, so it falls to bisque — the gentler set, and
  // the one whose low-temperature zones are relevant to a firing that has only
  // just started.
  function zonesForPeak(peakC) {
    const peak = Number(peakC)
    if (!Number.isFinite(peak) || peak <= 0) return ZONES.bisque
    return peak < BISQUE_MAX_C ? ZONES.bisque : ZONES.glaze
  }

  return { zonesForPeak, zoneBoxesFor, spansIn, BISQUE_MAX_C }
}