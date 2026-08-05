// File: app/composables/useCurveSegments.js
//
// Waypoints ⇄ segments. The stored model is and stays waypoints
// ([{ offsetMinutes, targetTemp }] in °C) — this is purely a lens over it.
//
// WHY: nobody plans a firing in offset-minutes. Potters (and every kiln
// controller — Bartlett, Orton, Skutt) think in SEGMENTS:
//
//     ramp at 100°C/hr → to 600°C → hold 0 min
//     ramp at 150°C/hr → to 1220°C → hold 20 min
//
// Time is the OUTPUT of that, not the input. "How many minutes in is my
// bisque hold?" is a question no one can answer without a calculator; "150
// degrees an hour to cone 6, hold 20" is how the schedule was told to them.
//
// Round-tripping is lossy in one direction only: points → segments rounds
// rates to whole degrees/hr. Going back out regenerates exact minutes. So
// editing a segment rewrites the curve; editing the graph re-derives segments.
// Never run both directions in one tick (see ScheduleSegmentEditor's guard).

export const FULL_RATE = 9999   // "as fast as the kiln will go" — controller convention

// Waypoints → segments. Returns { ambient, startMins, segments }.
// A flat pair (same temp) becomes a HOLD on the preceding segment rather than
// a segment of its own — that's how a controller reads it, and it halves the
// row count on a typical bisque curve.
export function pointsToSegments(points) {
  const pts = [...(points ?? [])]
    .filter(p => p && p.offsetMinutes != null && p.targetTemp != null)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)

  if (pts.length < 2) {
    return { ambient: pts[0]?.targetTemp ?? 20, startMins: pts[0]?.offsetMinutes ?? 0, segments: [] }
  }

  const ambient   = pts[0].targetTemp
  const startMins = pts[0].offsetMinutes
  const segments  = []

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i]
    const dMins = cur.offsetMinutes - prev.offsetMinutes
    const dTemp = cur.targetTemp - prev.targetTemp

    if (dTemp === 0) {
      // Flat run = a hold. Attach to the previous segment; if there isn't one
      // (curve opens with a soak at ambient), make a zero-ramp segment so the
      // time isn't silently lost.
      if (segments.length) segments[segments.length - 1].hold += Math.max(0, Math.round(dMins))
      else segments.push({ rate: FULL_RATE, target: cur.targetTemp, hold: Math.max(0, Math.round(dMins)) })
      continue
    }

    const rate = dMins > 0 ? Math.round(Math.abs(dTemp) / dMins * 60) : FULL_RATE
    segments.push({ rate: Math.min(rate, FULL_RATE), target: cur.targetTemp, hold: 0 })
  }

  return { ambient, startMins, segments }
}

// Segments → waypoints. Direction (heat or cool) is implied by target vs the
// running temperature, so `rate` is always a positive magnitude in °C/hr.
export function segmentsToPoints(ambient, segments, startMins = 0) {
  const pts = [{ offsetMinutes: Math.max(0, Math.round(startMins)), targetTemp: Math.round(ambient) }]
  let t = pts[0].offsetMinutes
  let cur = pts[0].targetTemp

  for (const seg of (segments ?? [])) {
    const target = Number(seg.target)
    if (!Number.isFinite(target)) continue

    if (target !== cur) {
      const rate = Math.max(1, Math.abs(Number(seg.rate) || FULL_RATE))
      // FULL_RATE collapses the ramp to a nominal 1 minute rather than 0, so
      // two points never share an x (which would break the curve's geometry).
      const mins = rate >= FULL_RATE ? 1 : Math.max(1, Math.round(Math.abs(target - cur) / rate * 60))
      t += mins
      pts.push({ offsetMinutes: t, targetTemp: Math.round(target) })
      cur = target
    }

    const hold = Math.max(0, Math.round(Number(seg.hold) || 0))
    if (hold > 0) {
      t += hold
      pts.push({ offsetMinutes: t, targetTemp: Math.round(target) })
    }
  }

  return pts
}

// Minutes a segment will take, for the read-only duration column.
export function segmentMinutes(fromTemp, seg) {
  const target = Number(seg.target)
  const hold   = Math.max(0, Math.round(Number(seg.hold) || 0))
  if (!Number.isFinite(target)) return hold
  if (target === fromTemp) return hold
  const rate = Math.max(1, Math.abs(Number(seg.rate) || FULL_RATE))
  const ramp = rate >= FULL_RATE ? 1 : Math.max(1, Math.round(Math.abs(target - fromTemp) / rate * 60))
  return ramp + hold
}

export function formatMins(m) {
  const h = Math.floor(m / 60), min = m % 60
  if (h === 0) return `${min}m`
  return min === 0 ? `${h}h` : `${h}h ${min}m`
}

export function useCurveSegments() {
  return { pointsToSegments, segmentsToPoints, segmentMinutes, formatMins, FULL_RATE }
}