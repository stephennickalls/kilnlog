<!-- app/components/PrintCurve.vue -->
<!--
  The firing curve as it appears on a PRINTED plan. Static SVG: no drag
  handles, no hit areas, no tables.

  WHY NOT REUSE ScheduleCurveEditor OR ScheduleSparkline. The editor is an
  editing surface - 14px invisible drag rings, a 16px transparent click path
  along the curve, per-point index labels - all of which print as clutter and
  none of which a sheet of paper can use. The sparkline is the opposite
  problem: it deliberately has no axes, because at 64x32 in a list row axes
  would be illegible. A printed plan going into a student's coursework needs
  the one thing both of those omit, which is a temperature scale somebody can
  read a number off.

  ── SHAPE IS THE GRAMMAR (Sep 2026) ────────────────────────────────────────

  Two kinds of annotation sit on this chart and they must not look alike.

  ATMOSPHERE is a FULL-HEIGHT VERTICAL STRIPE. Reduction is a state of the
  whole kiln over a stretch of time. Once it has started it has no temperature
  extent - everything in the kiln is in it - so full height is the honest
  drawing.

  A KEY TEMPERATURE is a BOX SITTING ON THE CURVE. Both of its axes carry
  meaning: the height is the temperature range, the width is how long the ware
  spends inside it. This replaced a full-width horizontal band, which was wrong
  for any event that only happens on one leg of the firing. Cristobalite
  contracts on the way DOWN; a stripe across the whole chart claimed it also
  mattered on the climb. Glaze sealing is the opposite - it is a heating event,
  and by the descent the glaze is long since sealed and it is no longer
  interesting.

  Flipping the bands to vertical was considered and rejected: a vertical stripe
  says "somewhere in here", which is exactly what the atmosphere bands say, and
  the two would become indistinguishable. It also throws away the temperature,
  and the temperature is the entire content of the band - "quartz inversion"
  MEANS 573C.

  So a band is horizontal in temperature and CLIPPED IN TIME. spansIn() walks
  the curve for the stretches that are inside the temperature range while
  travelling in the right direction, and each stretch becomes a box. A both-legs
  event like quartz inversion therefore draws TWICE on a schedule with a
  controlled cool - once on the climb and once on the descent - which is
  correct, and more useful than one stripe, because the second box is where the
  50C/hr limit actually applies.

  ── WHERE THE ZONES COME FROM ──────────────────────────────────────────────

  useFiringZones, the SAME source the live chart reads. This file used to carry
  its own KEY_TEMPS list, which meant the printed sheet and the screen could
  disagree about physics - and briefly did, because the print list had a glaze
  band on the ascent while the screen had one on the descent, both called the
  same thing. There is now one list, with a `leg` on every entry, and both
  renderers clip it with the same spansIn().

  zonesForPeak picks the bisque set or the glaze set from the plan's peak, so
  this component does not need to be told the schedule's type.

  ── COLOUR ─────────────────────────────────────────────────────────────────

  Colour encodes CATEGORY, never value:

    flame   the plan itself, the only thing the potter authored
    celadon atmosphere, matching the reduction bands on the live chart
    rose    'crack' - where you lose work, the two inversions
    violet  'glaze' - glaze behaviour rather than body behaviour
    grey    'process' - something happening, nothing at stake

  Those are the same three tone names the screen chart uses, so a zone is the
  same colour on paper as it was on the monitor.

  It still has to survive mono: every box keeps its label and its own outline,
  so a photocopy loses the colour and none of the meaning. Browsers strip print
  backgrounds by default, hence print-color-adjust in the style block.

  GRID DENSITY is lower than on screen. A 190mm-wide print at 96dpi is about
  720px, but the reader is holding it at arm's length rather than leaning into
  a monitor, so lines that read fine on screen turn into hatching on paper.

  WAYPOINT LABELS THIN THEMSELVES OUT. A label is skipped when it would land on
  top of the last one drawn - the Program table underneath carries every value
  exactly, so the chart's job is orientation, not data recovery. The peak is
  always labelled regardless.

  UNITS: points arrive as degrees C, like everywhere else in the app. Only the
  axis and waypoint labels convert.
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
    <defs>
      <!-- Atmosphere keeps a hatch as well as a wash. The wash carries the
           category at a glance; the hatch is what survives a photocopy. -->
      <pattern id="printHatchRed" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0,6 L6,0" stroke="#5f8a78" stroke-width="0.6" stroke-opacity="0.55" />
      </pattern>
      <pattern id="printHatchOx" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0,0 L6,6" stroke="#8a7a5f" stroke-width="0.6" stroke-opacity="0.5" />
      </pattern>
    </defs>

    <!-- Plot frame. A full box rather than two axes: on paper the closed
         rectangle reads as a chart, two bare lines read as a mistake. -->
    <rect
      :x="PAD_L" :y="PAD_T"
      :width="PLOT_W" :height="PLOT_H"
      fill="#fff" stroke="#1a1208" stroke-width="1"
    />

    <!-- Horizontal grid + temperature scale -->
    <g v-for="t in tempLines" :key="'t' + t">
      <line
        :x1="PAD_L" :y1="tempToY(t)" :x2="W - PAD_R" :y2="tempToY(t)"
        stroke="#1a1208" stroke-width="0.4" stroke-opacity="0.16"
      />
      <text
        :x="PAD_L - 6" :y="tempToY(t) + 3"
        text-anchor="end" font-size="9" font-family="Georgia, serif" fill="#1a1208"
      >{{ displayTemp(t) }}</text>
    </g>

    <!-- Vertical grid + time scale -->
    <g v-for="m in timeLines" :key="'m' + m">
      <line
        :x1="minsToX(m)" :y1="PAD_T" :x2="minsToX(m)" :y2="H - PAD_B"
        stroke="#1a1208" stroke-width="0.4" stroke-opacity="0.16"
      />
      <text
        :x="minsToX(m)" :y="H - PAD_B + 14"
        text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#1a1208"
      >{{ minsToLabel(m) }}</text>
    </g>

    <!-- Axis captions. Spelled out because the reader may be a tutor who has
         never seen the app and has no idea what the numbers are. -->
    <text
      :x="PAD_L + PLOT_W / 2" :y="H - 4"
      text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#1a1208"
    >Time from start</text>
    <text
      :x="12" :y="PAD_T + PLOT_H / 2"
      text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#1a1208"
      :transform="`rotate(-90 12 ${PAD_T + PLOT_H / 2})`"
    >Temperature {{ unitLabel }}</text>

    <!-- ── Atmosphere: full-height vertical stripes. See the grammar note. ── -->
    <g v-for="(band, i) in bands" :key="'b' + i">
      <rect :x="band.left" :y="PAD_T" :width="band.width" :height="PLOT_H" :fill="band.wash" />
      <rect :x="band.left" :y="PAD_T" :width="band.width" :height="PLOT_H" :fill="band.hatch" />
      <line
        :x1="band.left" :y1="PAD_T" :x2="band.left" :y2="H - PAD_B"
        :stroke="band.stroke" stroke-width="0.9" stroke-dasharray="3 2"
      />
      <text
        v-if="band.width > 42"
        :x="band.left + 5" :y="H - PAD_B - 6"
        font-size="8.5" font-family="Georgia, serif" font-weight="bold" :fill="band.stroke"
        stroke="#fff" stroke-width="2.5" paint-order="stroke" stroke-linejoin="round"
      >{{ band.label }}</text>
    </g>

    <!-- ── Key temperatures: boxes on the curve ── -->
    <g v-for="(k, i) in keyBoxes" :key="'k' + i">
      <rect
        :x="k.left" :y="k.y" :width="k.width" :height="k.height"
        :fill="k.fill" :stroke="k.line" stroke-width="0.7" stroke-dasharray="2 1.6"
      />
      <line
        v-if="k.leader"
        :x1="k.leader.x1" :y1="k.leader.y1" :x2="k.leader.x2" :y2="k.leader.y2"
        :stroke="k.line" stroke-width="0.6" stroke-opacity="0.8"
      />
      <text
        :x="k.labelX" :y="k.labelY"
        text-anchor="middle" font-size="8" font-family="Georgia, serif" :fill="k.text"
        stroke="#fff" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round"
      >{{ k.labelText }}</text>
    </g>

    <!-- The curve. Heavy so it survives a photocopy, and drawn last so it is
         never buried under an annotation. -->
    <path
      v-if="pts.length >= 2"
      :d="curvePath"
      fill="none" stroke="#b05c1a" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round"
    />

    <!-- Waypoints. Labels thin themselves out; see the header note. -->
    <g v-for="(p, i) in plotted" :key="'p' + i">
      <circle
        :cx="p.x" :cy="p.y"
        :r="p.peak ? 3.2 : 2.5"
        fill="#fff" stroke="#b05c1a" :stroke-width="p.peak ? 2 : 1.5"
      />
      <text
        v-if="p.show"
        :x="p.x" :y="p.y + (p.above ? -8 : 15)"
        text-anchor="middle" font-size="8.5" font-family="Georgia, serif"
        :font-weight="p.peak ? 'bold' : 'normal'" fill="#7a3f11"
        stroke="#fff" stroke-width="2.5" paint-order="stroke" stroke-linejoin="round"
      >{{ displayTemp(p.targetTemp) }}{{ unitLabel }}</text>
    </g>
  </svg>
</template>

<script setup>
// app/components/PrintCurve.vue
import { computed } from 'vue'

const props = defineProps({
  points:     { type: Array,   default: () => [] },  // [{ offsetMinutes, targetTemp }] degrees C
  reductions: { type: Array,   default: () => [] },  // [{ startTemp, endTemp|null, kind }] degrees C
  keyTemps:   { type: Boolean, default: true },      // the reference-zone overlay
})

const { displayTemp, unitLabel } = useTempUnit()
const { zonesForPeak, zoneBoxesFor } = useFiringZones()

// Sized for a 190mm content column on A4.
const W = 720
const H = 430
const PAD_L = 48
const PAD_R = 16
const PAD_T = 18
const PAD_B = 34

const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

// A steep ramp crosses a 70C zone in minutes, which is a box a couple of units
// wide and invisible. Below this it is widened about its own centre - the box
// stops being a measurement and becomes a marker, which is the right trade
// when the alternative is nothing on the page at all.
const MIN_BOX_W = 11
const MIN_BOX_H = 6

// Print equivalents of the screen chart's ZONE_STYLE, keyed by the same tone
// names, so a zone is the same colour on paper as it was on the monitor.
// Lighter than the screen fills: 0.18 alpha over a white sheet under a desk
// lamp reads much heavier than the same value on a backlit parchment page.
const TONES = {
  crack:   { fill: 'rgba(178,64,54,0.14)',   line: '#8a2620', text: '#7a231d' },
  glaze:   { fill: 'rgba(124,90,180,0.14)',  line: '#54368a', text: '#4c3080' },
  process: { fill: 'rgba(120,113,108,0.15)', line: '#6b6560', text: '#504c48' },
}

const pts = computed(() =>
  [...(props.points ?? [])]
    .filter(p => p && p.offsetMinutes != null && p.targetTemp != null)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
)

const curve = computed(() => pts.value.map(p => ({ x: p.offsetMinutes, y: p.targetTemp })))

const maxMins = computed(() => {
  const last = pts.value[pts.value.length - 1]
  return Math.max(last ? last.offsetMinutes : 0, 60)
})

const peakTemp = computed(() =>
  pts.value.length ? Math.max(...pts.value.map(p => p.targetTemp)) : 0
)

const maxTemp = computed(() => Math.ceil((peakTemp.value + 60) / 100) * 100 || 100)

function minsToX(m) { return PAD_L + (m / maxMins.value) * PLOT_W }
function tempToY(t) { return PAD_T + (1 - t / maxTemp.value) * PLOT_H }

// Coarser than the screen editor on purpose - see the header note about
// reading distance.
const tempLines = computed(() => {
  const step = maxTemp.value <= 600 ? 100 : 200
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

// ── Key temperature boxes, with their labels placed ──────────────────────────
// Labels sit above their box and are pushed up a row at a time when they would
// collide with one already placed, with a leader line drawn once the gap is big
// enough to be ambiguous. Anything that cannot fit above goes below instead.
const LABEL_LINE = 11
const CHAR_W     = 4.3

const keyBoxes = computed(() => {
  if (!props.keyTemps || curve.value.length < 2) return []

  const boxes = []

  // One entry per CROSSING, not per zone: quartz inversion on a schedule with
  // a controlled cool comes back twice, once climbing and once cooling.
  for (const z of zoneBoxesFor(curve.value, zonesForPeak(peakTemp.value))) {
    const x0 = minsToX(z.x0)
    const x1 = minsToX(z.x1)

    let left  = x0
    let width = x1 - x0
    if (width < MIN_BOX_W) {
      left  = (x0 + x1) / 2 - MIN_BOX_W / 2
      width = MIN_BOX_W
    }
    left = Math.max(PAD_L, Math.min(left, W - PAD_R - width))

    // yLo/yHi are the range the curve actually covered on this crossing, so a
    // plan that peaks mid-zone gets a box that stops at the peak.
    const yTop    = tempToY(z.yHi)
    const yBottom = tempToY(z.yLo)
    const tone    = TONES[z.tone] ?? TONES.process

    boxes.push({
      left,
      width,
      y:      yTop,
      height: Math.max(yBottom - yTop, MIN_BOX_H),
      fill:   tone.fill,
      line:   tone.line,
      text:   tone.text,
      // The zone's `note` is a full sentence written for a hover on screen and
      // is far too long to sit under a box. Paper gets the label only.
      labelText: z.label,
    })
  }

  // Greedy left-to-right placement. Sorting by x means a label only ever has
  // to dodge labels to its left, which is what keeps this a single pass.
  const placed = []
  for (const b of boxes.sort((p, q) => p.left - q.left)) {
    const w  = b.labelText.length * CHAR_W
    const cx = Math.max(PAD_L + w / 2 + 3, Math.min(b.left + b.width / 2, W - PAD_R - w / 2 - 3))

    let y = b.y - 5
    let guard = 0
    while (
      guard++ < 10 &&
      placed.some(p =>
        Math.abs(p.y - y) < LABEL_LINE &&
        cx - w / 2 < p.cx + p.w / 2 + 5 &&
        cx + w / 2 > p.cx - p.w / 2 - 5
      )
    ) y -= LABEL_LINE

    // Ran out of headroom: drop it under the box instead.
    if (y < PAD_T + 9) y = b.y + b.height + 11

    const boxCx = b.left + b.width / 2
    const above = y < b.y
    const gap   = above ? b.y - y : y - (b.y + b.height)

    b.labelX = cx
    b.labelY = y
    b.leader = gap > 9
      ? { x1: cx, y1: above ? y + 3 : y - 8, x2: boxCx, y2: above ? b.y : b.y + b.height }
      : null

    placed.push({ cx, y, w })
  }

  return boxes
})

// ── Waypoints ────────────────────────────────────────────────────────────────
// A label is drawn only when it clears the last one drawn. The peak always
// wins, so the number people look for first is never the one suppressed.
const MIN_LABEL_DX = 34
const MIN_LABEL_DY = 16

const plotted = computed(() => {
  const out = []
  let lastX = -1e9, lastY = -1e9, shown = 0

  for (const p of pts.value) {
    const x = minsToX(p.offsetMinutes)
    const y = tempToY(p.targetTemp)
    const peak = p.targetTemp === peakTemp.value
    const clear = Math.abs(x - lastX) >= MIN_LABEL_DX || Math.abs(y - lastY) >= MIN_LABEL_DY
    const show = peak || clear

    out.push({ ...p, x, y, peak, show, above: shown % 2 === 0 })

    if (show) { lastX = x; lastY = y; shown++ }
  }
  return out
})

// ── Atmosphere bands ─────────────────────────────────────────────────────────
// A reduction is defined by TEMPERATURES; the stripe draws across TIME. Walk
// the curve in time order for the first crossing of the start temp, then from
// there for the next crossing of the end temp - which lands a COOLING band
// (end below start) on the descending leg without a special case. Same rule as
// ScheduleCurveEditor, kept in step deliberately.
//
// The label moved to the BOTTOM of the stripe (Sep 2026). It used to sit at the
// top, where the key temperature labels now live, and the two collided on every
// gas schedule - body reduction starts around 894C, which is exactly where the
// glaze seal and burnout boxes are.
function xAtTemp(pointsC, temp, fromX) {
  for (let i = 0; i < pointsC.length - 1; i++) {
    const a = pointsC[i], b = pointsC[i + 1]
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
  const c = curve.value
  if (c.length < 2) return []
  const firstX = c[0].x
  const lastX  = c[c.length - 1].x
  const out = []

  for (const r of (props.reductions ?? [])) {
    const startTemp = r.startTemp ?? r.start_temp
    if (startTemp == null) continue
    const endTemp = r.endTemp ?? r.end_temp ?? null

    const startMin = xAtTemp(c, startTemp, firstX)
    if (startMin === null) continue                 // plan never reaches it

    const endMin = endTemp == null
      ? lastX
      : (xAtTemp(c, endTemp, startMin) ?? lastX)

    const xL = minsToX(Math.min(startMin, endMin))
    const xR = minsToX(Math.max(startMin, endMin))
    const ox = r.kind === 'oxidation'

    out.push({
      left:   xL,
      width:  Math.max(xR - xL, 1.5),
      label:  ox ? 'Oxidation' : 'Reduction',
      wash:   ox ? 'rgba(138,122,95,0.10)' : 'rgba(95,138,120,0.14)',
      hatch:  ox ? 'url(#printHatchOx)' : 'url(#printHatchRed)',
      stroke: ox ? '#6d6047' : '#3a5a48',
    })
  }
  return out
})
</script>

<style scoped>
/* Browsers drop background fills when printing unless told otherwise, and
   every band and box on this chart is a fill. Without this the annotations
   come out blank and the labels sit on nothing. */
.print-curve {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>