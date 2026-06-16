<!-- app/components/ScheduleSparkline.vue -->
<!--
  Read-only mini curve. Dumb on purpose: it renders whatever stroke/fill colour
  it's handed, so the firing-type → colour mapping can live in one place
  (useScheduleTheme). Bisque comes through warm flame, glaze celadon, raku cobalt.

  Self-contained linear-path math (no axis chrome). Flat holds read as a flat
  line through the middle, never a dot, via the y-range guard.

  G11: optional `reductions` ([{ startTemp, endTemp|null }] °C) render as very
  faint shaded bands behind the curve — a glanceable "this schedule plans a
  reduction here". No labels (it's a thumbnail). Mapped temp→x by walking the
  curve in time order, so a cooling reduction (end below start) lands on the
  descending leg. Temps are °C; geometry is display-agnostic.
-->
<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="block"
    preserveAspectRatio="none"
  >
    <!-- G11: planned reduction bands, behind everything -->
    <rect
      v-for="(b, i) in reductionBands" :key="'rb' + i"
      :x="b.left" :y="PAD"
      :width="b.width" :height="height - PAD * 2"
      fill="rgba(99,102,241,0.10)"
    />

    <path v-if="fillPath" :d="fillPath" :fill="fill" />
    <path
      v-if="linePath"
      :d="linePath"
      fill="none"
      :stroke="stroke"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="!linePath"
      :x1="PAD" :y1="height / 2"
      :x2="width - PAD" :y2="height / 2"
      stroke="#e7e5e4"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  points:     { type: Array,  default: () => [] }, // [{ offsetMinutes, targetTemp }]
  reductions: { type: Array,  default: () => [] }, // G11: [{ startTemp, endTemp|null }] °C
  width:      { type: Number, default: 120 },
  height:     { type: Number, default: 40 },
  stroke:     { type: String, default: '#b8551c' },                 // theme.stroke
  fill:       { type: String, default: 'rgba(184,85,28,0.07)' },    // theme.fill
})

const PAD = 3

const sorted = computed(() =>
  [...props.points]
    .filter(p => p && p.offsetMinutes != null && p.targetTemp != null)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
)

const xRange = computed(() => {
  const maxX = sorted.value.length ? sorted.value[sorted.value.length - 1].offsetMinutes : 0
  return Math.max(maxX, 1)
})

const yBounds = computed(() => {
  if (!sorted.value.length) return { min: 0, max: 1 }
  const temps = sorted.value.map(p => p.targetTemp)
  let min = Math.min(...temps)
  let max = Math.max(...temps)
  if (max - min < 1) { min -= 1; max += 1 }
  return { min, max }
})

function xFor(m) {
  const inner = props.width - PAD * 2
  return PAD + (m / xRange.value) * inner
}
function yFor(t) {
  const { min, max } = yBounds.value
  const inner = props.height - PAD * 2
  return PAD + (1 - (t - min) / (max - min)) * inner
}

const linePath = computed(() => {
  const pts = sorted.value
  if (pts.length < 2) return ''
  let d = `M ${xFor(pts[0].offsetMinutes)} ${yFor(pts[0].targetTemp)}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${xFor(pts[i].offsetMinutes)} ${yFor(pts[i].targetTemp)}`
  }
  return d
})

const fillPath = computed(() => {
  const pts = sorted.value
  if (pts.length < 2) return ''
  const bottom = props.height - PAD
  const firstX = xFor(pts[0].offsetMinutes)
  const lastX  = xFor(pts[pts.length - 1].offsetMinutes)
  return `${linePath.value} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`
})

// G11: map reduction temps → x over the planned curve, in time order.
function curveXAtTemp(curve, temp, fromM) {
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1]
    if (b.offsetMinutes < fromM) continue
    const lo = Math.min(a.targetTemp, b.targetTemp), hi = Math.max(a.targetTemp, b.targetTemp)
    if (temp >= lo && temp <= hi) {
      const span = b.targetTemp - a.targetTemp
      const frac = span === 0 ? 0 : (temp - a.targetTemp) / span
      const m = a.offsetMinutes + frac * (b.offsetMinutes - a.offsetMinutes)
      if (m >= fromM - 1e-6) return m
    }
  }
  return null
}

const reductionBands = computed(() => {
  const curve = sorted.value
  if (curve.length < 2) return []
  const firstM = curve[0].offsetMinutes
  const lastM  = curve[curve.length - 1].offsetMinutes
  function peakMFrom(fromM) {
    let bestM = fromM, bestT = -Infinity
    for (const p of curve) {
      if (p.offsetMinutes < fromM) continue
      if (p.targetTemp > bestT) { bestT = p.targetTemp; bestM = p.offsetMinutes }
    }
    return bestM
  }
  const out = []
  for (const r of (props.reductions ?? [])) {
    const startTemp = r.startTemp ?? r.start_temp
    const endTemp   = (r.endTemp ?? r.end_temp ?? null)
    if (startTemp == null) continue
    const startM = curveXAtTemp(curve, startTemp, firstM)
    if (startM === null) continue
    const open = endTemp === null || endTemp === undefined
    let endM
    if (open) {
      endM = lastM
    } else {
      endM = curveXAtTemp(curve, endTemp, startM)
      if (endM === null) endM = peakMFrom(startM)   // unreached end → peak, not plan end
    }
    const xL = xFor(Math.min(startM, endM))
    const xR = xFor(Math.max(startM, endM))
    out.push({ left: xL, width: Math.max(xR - xL, 1) })
  }
  return out
})
</script>