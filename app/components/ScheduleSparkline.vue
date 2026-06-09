<!-- app/components/ScheduleSparkline.vue -->
<!--
  Read-only mini curve. Dumb on purpose: it renders whatever stroke/fill colour
  it's handed, so the firing-type → colour mapping can live in one place
  (useScheduleTheme). Bisque comes through warm flame, glaze celadon, raku cobalt.

  Self-contained linear-path math (no axis chrome). Flat holds read as a flat
  line through the middle, never a dot, via the y-range guard.
-->
<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="block"
    preserveAspectRatio="none"
  >
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
  points: { type: Array,  default: () => [] }, // [{ offsetMinutes, targetTemp }]
  width:  { type: Number, default: 120 },
  height: { type: Number, default: 40 },
  stroke: { type: String, default: '#b8551c' },                 // theme.stroke
  fill:   { type: String, default: 'rgba(184,85,28,0.07)' },    // theme.fill
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
</script>