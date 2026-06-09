// app/composables/useCurveSimplify.js
//
// Douglas–Peucker (Ramer–Douglas–Peucker) line simplification for turning a
// noisy ~200-reading firing into a clean handful of ramp/hold segments.
//
// THE NORMALIZATION (the part that matters): x is minutes, y is degrees —
// different units. Raw perpendicular distance would treat a 10-minute wiggle as
// equal to a 10-degree wiggle, so holds and ramps would simplify unevenly. We
// normalize BOTH axes to [0,1] over the curve's own range before measuring
// distance, so epsilon is a single unit-free "detail" knob.
//
// THE ONE DIAL: epsilon is what the detail slider controls. Small ε → almost
// nothing discarded → near-raw (every point). Large ε → only the biggest bends
// survive → few clean segments. Raw and simplified are the two ends of one
// range, not two modes. Default to a simplified ε (see SUGGESTED_EPSILON).
//
// FLOW BOUNDARY (for C2): the slider is the GENERATOR — moving it re-runs
// simplify() on the ORIGINAL raw readings, which necessarily discards any manual
// point edits the user made afterward. C2 must surface that honestly (an inline
// "regenerating replaces your manual tweaks" note), because manual editing via
// the curve editor / waypoints table happens AFTER sliding, as refinement on top
// of the generated result. simplify() itself is pure and stateless.

// ── Core RDP, operating in normalized [0,1] space ─────────────────────────────
// `pts` here are already-normalized { nx, ny, ref } objects (ref = original pt).
function rdpNormalized(pts, epsilon) {
  if (pts.length < 3) return pts.slice()

  const first = pts[0]
  const last  = pts[pts.length - 1]

  // Find the point farthest from the line first→last (perpendicular distance).
  let maxDist = -1
  let idx = -1
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDistance(pts[i], first, last)
    if (d > maxDist) { maxDist = d; idx = i }
  }

  // If the farthest point is within tolerance, the straight line is good enough
  // — drop everything between the endpoints.
  if (maxDist <= epsilon) return [first, last]

  // Otherwise that point is a real bend: keep it, recurse on both halves.
  const left  = rdpNormalized(pts.slice(0, idx + 1), epsilon)
  const right = rdpNormalized(pts.slice(idx), epsilon)
  // left's last === right's first (the bend point) — drop the duplicate.
  return left.slice(0, -1).concat(right)
}

// Perpendicular distance from point p to the line through a→b, in normalized
// space. Handles the degenerate a===b case (returns straight distance).
function perpDistance(p, a, b) {
  const dx = b.nx - a.nx
  const dy = b.ny - a.ny
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ddx = p.nx - a.nx, ddy = p.ny - a.ny
    return Math.sqrt(ddx * ddx + ddy * ddy)
  }
  // Cross-product magnitude / segment length = perpendicular distance.
  const cross = Math.abs(dy * p.nx - dx * p.ny + b.nx * a.ny - b.ny * a.nx)
  return cross / Math.sqrt(lenSq)
}

// ── Public: simplify(points, epsilon) → [{ offsetMinutes, targetTemp }] ────────
// `points` is the raw firing curve as [{ offsetMinutes, targetTemp }].
// `epsilon` is the unit-free tolerance in [0,1] space (the slider value).
export function simplify(points, epsilon = SUGGESTED_EPSILON) {
  const clean = (points ?? [])
    .filter(p => p && p.offsetMinutes != null && p.targetTemp != null)
    .map(p => ({ offsetMinutes: p.offsetMinutes, targetTemp: p.targetTemp }))
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)

  if (clean.length <= 2) return clean

  // Build normalized space over the curve's own ranges.
  const xs = clean.map(p => p.offsetMinutes)
  const ys = clean.map(p => p.targetTemp)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)
  const xSpan = (xMax - xMin) || 1
  const ySpan = (yMax - yMin) || 1

  const norm = clean.map(p => ({
    nx:  (p.offsetMinutes - xMin) / xSpan,
    ny:  (p.targetTemp    - yMin) / ySpan,
    ref: p,
  }))

  const kept = rdpNormalized(norm, epsilon)
  return kept.map(n => n.ref)
}

// ── Epsilon ↔ slider mapping ──────────────────────────────────────────────────
// The slider is a single 0..1 "detail" value where 1 = maximum detail (raw) and
// 0 = maximum simplification. We map that to an epsilon range tuned empirically
// (see the test harness): EPS_MIN keeps essentially everything, EPS_MAX reduces
// a typical firing to a handful of segments.
export const EPS_MIN = 0.004   // slider at max detail → near-raw
export const EPS_MAX = 0.16    // slider at min detail → coarse handful of points

// Default sits toward the simplified end but not maximally coarse. The harness
// showed 0.05 drops the gas-out RECOVERY point (keeps the dip, flattens the
// shoulder) — but capturing exactly that kind of event is the soul of the
// from-firing feature, so we default a touch finer at 0.025: ~6–8 pts, ~96%
// reduction, dip AND recovery preserved. Users can slide coarser for the
// idealized version.
export const SUGGESTED_EPSILON = 0.025

// detail ∈ [0,1] (1 = raw). Non-linear (pow) so the useful low-epsilon region
// gets more of the slider's travel.
export function detailToEpsilon(detail) {
  const d = Math.min(Math.max(detail, 0), 1)
  // invert: high detail → low epsilon
  const t = 1 - d
  const eased = Math.pow(t, 1.8)
  return EPS_MIN + eased * (EPS_MAX - EPS_MIN)
}

export function epsilonToDetail(epsilon) {
  const e = Math.min(Math.max(epsilon, EPS_MIN), EPS_MAX)
  const eased = (e - EPS_MIN) / (EPS_MAX - EPS_MIN)
  const t = Math.pow(eased, 1 / 1.8)
  return 1 - t
}

// Composable wrapper (parallels the project's use* convention). Stateless —
// just exposes the pure functions and the tuning constants.
export function useCurveSimplify() {
  return {
    simplify,
    detailToEpsilon,
    epsilonToDetail,
    EPS_MIN,
    EPS_MAX,
    SUGGESTED_EPSILON,
  }
}