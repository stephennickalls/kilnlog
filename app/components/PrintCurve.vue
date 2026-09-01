<!-- app/components/PrintCurve.vue -->
<!--
  The firing curve as it appears on a PRINTED plan. Static SVG: no drag
  handles, no hit areas, no tables.

  WHY NOT REUSE ScheduleCurveEditor OR ScheduleSparkline. The editor is an
  editing surface — 14px invisible drag rings, a 16px transparent click path
  along the curve, per-point index labels — all of which print as clutter and
  none of which a sheet of paper can use. The sparkline is the opposite
  problem: it deliberately has no axes, because at 64x32 in a list row axes
  would be illegible. A printed plan going into a student's coursework needs
  the one thing both of those omit, which is a temperature scale somebody can
  read a number off.

  So this is a third thing, and that is correct rather than duplication: three
  different jobs. It shares the coordinate maths with the editor because the
  maths is right, not because the components are related.

  BLACK ON WHITE. Colour on the screen distinguishes firing types at a glance
  in a list; on a page there is one curve and no list, so colour buys nothing
  and costs ink. Structure comes from stroke weight and dash pattern instead.

  GRID DENSITY is lower than on screen. A 190mm-wide print at 96dpi is about
  720px, but the reader is holding it at arm's length rather than leaning into
  a monitor, so lines that read fine on screen turn into hatching on paper.

  UNITS: points arrive as °C, like everywhere else in the app. Only the axis
  and waypoint labels convert.
-->
<template>
  <svg
    class="print-curve"
    :viewBox="`0 0 ${W} ${H}`"
    :width="W"
    :height="H"
    style="width:100%;height:auto"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Plot frame. A full box rather than two axes: on paper the closed
         rectangle reads as a chart, two bare lines read as a mistake. -->
    <rect
      :x="PAD_L" :y="PAD_T"
      :width="W - PAD_L - PAD_R" :height="H - PAD_T - PAD_B"
      fill="none" stroke="#000" stroke-width="1"
    />

    <!-- Horizontal grid + temperature scale -->
    <g v-for="t in tempLines" :key="'t' + t">
      <line
        :x1="PAD_L" :y1="tempToY(t)" :x2="W - PAD_R" :y2="tempToY(t)"
        stroke="#000" stroke-width="0.4" stroke-opacity="0.18"
      />
      <text
        :x="PAD_L - 5" :y="tempToY(t) + 3"
        text-anchor="end" font-size="9" font-family="Georgia, serif" fill="#000"
      >{{ displayTemp(t) }}</text>
    </g>

    <!-- Vertical grid + time scale -->
    <g v-for="m in timeLines" :key="'m' + m">
      <line
        :x1="minsToX(m)" :y1="PAD_T" :x2="minsToX(m)" :y2="H - PAD_B"
        stroke="#000" stroke-width="0.4" stroke-opacity="0.18"
      />
      <text
        :x="minsToX(m)" :y="H - PAD_B + 13"
        text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#000"
      >{{ minsToLabel(m) }}</text>
    </g>

    <!-- Axis captions. Spelled out because the reader may be a tutor who has
         never seen the app and has no idea what the numbers are. -->
    <text
      :x="PAD_L + (W - PAD_L - PAD_R) / 2" :y="H - 3"
      text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#000"
    >Time from start</text>
    <text
      :x="11" :y="PAD_T + (H - PAD_T - PAD_B) / 2"
      text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#000"
      :transform="`rotate(-90 11 ${PAD_T + (H - PAD_T - PAD_B) / 2})`"
    >Temperature {{ unitLabel }}</text>

    <!-- Atmosphere bands. Hatched rather than filled: a grey fill either
         vanishes on a laser printer or swamps the curve, and a hatch survives
         a photocopy, which a college handout will get. -->
    <defs>
      <pattern id="printHatch" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0,6 L6,0" stroke="#000" stroke-width="0.5" stroke-opacity="0.35" />
      </pattern>
    </defs>
    <g v-for="(band, i) in bands" :key="'b' + i">
      <rect
        class="print-band"
        :x="band.left" :y="PAD_T"
        :width="band.width" :height="H - PAD_T - PAD_B"
        fill="url(#printHatch)"
      />
      <line
        :x1="band.left" :y1="PAD_T" :x2="band.left" :y2="H - PAD_B"
        stroke="#000" stroke-width="0.7" stroke-dasharray="3 2"
      />
      <text
        v-if="band.width > 40"
        :x="band.left + 4" :y="PAD_T + 11"
        font-size="8" font-family="Georgia, serif" font-weight="bold" fill="#000"
      >{{ band.label }}</text>
    </g>

    <!-- The curve. Heavy so it survives a photocopy. -->
    <path
      v-if="pts.length >= 2"
      :d="curvePath"
      fill="none" stroke="#000" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
    />

    <!-- Waypoints, each labelled with its temperature. The label is the point
         of the printed chart: someone reading it off paper cannot hover. -->
    <g v-for="(p, i) in pts" :key="'p' + i">
      <circle
        :cx="minsToX(p.offsetMinutes)" :cy="tempToY(p.targetTemp)"
        r="2.5" fill="#fff" stroke="#000" stroke-width="1.5"
      />
      <!-- Alternate above and below so consecutive labels on a steep ramp do
           not print on top of each other. -->
      <text
        :x="minsToX(p.offsetMinutes)"
        :y="tempToY(p.targetTemp) + (i % 2 === 0 ? -7 : 13)"
        text-anchor="middle" font-size="8" font-family="Georgia, serif" fill="#000"
      >{{ displayTemp(p.targetTemp) }}{{ unitLabel }}</text>
    </g>
  </svg>
</template>

<script setup>
// app/components/PrintCurve.vue
import { computed } from 'vue'

const props = defineProps({
  points:     { type: Array, default: () => [] },  // [{ offsetMinutes, targetTemp }] °C
  reductions: { type: Array, default: () => [] },  // [{ startTemp, endTemp|null, kind }] °C
})

const { displayTemp, unitLabel } = useTempUnit()

// Sized for a 190mm content column on A4 at a comfortable aspect. The SVG
// scales to 100% width, so these are proportions rather than pixels.
const W = 720
const H = 300
const PAD_L = 46
const PAD_R = 14
const PAD_T = 16
const PAD_B = 32

const pts = computed(() =>
  [...(props.points ?? [])]
    .filter(p => p && p.offsetMinutes != null && p.targetTemp != null)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
)

const maxMins = computed(() => {
  const last = pts.value[pts.value.length - 1]
  return Math.max(last ? last.offsetMinutes : 0, 60)
})

const maxTemp = computed(() => {
  const hi = pts.value.length ? Math.max(...pts.value.map(p => p.targetTemp)) : 100
  return Math.ceil((hi + 60) / 100) * 100
})

function minsToX(m) { return PAD_L + (m / maxMins.value) * (W - PAD_L - PAD_R) }
function tempToY(t) { return PAD_T + (1 - t / maxTemp.value) * (H - PAD_T - PAD_B) }

// Coarser than the screen editor on purpose — see the header note about
// reading distance. Aim for roughly six lines each way.
const tempLines = computed(() => {
  const step = maxTemp.value <= 600 ? 100 : maxTemp.value <= 1200 ? 200 : 250
  const out = []
  for (let t = 0; t <= maxTemp.value; t += step) out.push(t)
  return out
})

const timeLines = computed(() => {
  const hours = maxMins.value / 60
  const stepH = hours <= 4 ? 1 : hours <= 10 ? 2 : hours <= 24 ? 4 : 12
  const out = []
  for (let m = 0; m <= maxMins.value; m += stepH * 60) out.push(m)
  return out
})

function minsToLabel(m) {
  const h = Math.floor(m / 60), min = m % 60
  if (h === 0) return `${m}m`
  return min === 0 ? `${h}h` : `${h}h${min}m`
}

const curvePath = computed(() => {
  const p = pts.value
  if (p.length < 2) return ''
  let d = `M ${minsToX(p[0].offsetMinutes)} ${tempToY(p[0].targetTemp)}`
  for (let i = 1; i < p.length; i++) {
    d += ` L ${minsToX(p[i].offsetMinutes)} ${tempToY(p[i].targetTemp)}`
  }
  return d
})

// A reduction is defined by TEMPERATURES; the band draws across TIME. Walk the
// curve in time order for the first crossing of the start temp, then from there
// for the next crossing of the end temp — which lands a COOLING band (end below
// start) on the descending leg without a special case. Same rule as
// ScheduleCurveEditor, kept in step deliberately.
function xAtTemp(curve, temp, fromX) {
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1]
    if (b.x < fromX) continue
    const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y)
    if (temp >= lo && temp <= hi) {
      const span = b.y - a.y
      const x = a.x + (span === 0 ? 0 : (temp - a.y) / span) * (b.x - a.x)
      if (x >= fromX - 1e-6) return x
    }
  }
  return null
}

const bands = computed(() => {
  const curve = pts.value.map(p => ({ x: p.offsetMinutes, y: p.targetTemp }))
  if (curve.length < 2) return []
  const firstX = curve[0].x
  const lastX  = curve[curve.length - 1].x
  const out = []

  for (const r of (props.reductions ?? [])) {
    const startTemp = r.startTemp ?? r.start_temp
    if (startTemp == null) continue
    const endTemp = r.endTemp ?? r.end_temp ?? null

    const startMin = xAtTemp(curve, startTemp, firstX)
    if (startMin === null) continue                 // plan never reaches it

    const endMin = endTemp == null
      ? lastX
      : (xAtTemp(curve, endTemp, startMin) ?? lastX)

    const xL = minsToX(Math.min(startMin, endMin))
    const xR = minsToX(Math.max(startMin, endMin))
    out.push({
      left:  xL,
      width: Math.max(xR - xL, 1.5),
      label: r.kind === 'oxidation' ? 'Oxidation' : 'Reduction',
    })
  }
  return out
})
</script>