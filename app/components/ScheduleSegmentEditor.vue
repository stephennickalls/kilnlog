<!-- app/components/ScheduleSegmentEditor.vue -->
<!--
  The "Steps" view of a schedule — a TABLE, same grid/header/input styling as
  the Minutes table it sits beside, so switching views doesn't feel like
  switching apps.

  v-models the SAME [{ offsetMinutes, targetTemp }] array (°C) the curve editor
  and the Minutes table use. It's a lens over the stored model, not a second
  model, so graph / Steps / Minutes stay in sync automatically.

  Each row is one line of a kiln-controller program:

      #   Rate °C/hr   To °C   Hold   Time
      •   room temp    20      —      0m        ← the start row
      1   60           120     0      1h 40m
      2   100          600     0      4h 48m
      3   150          999     10     2h 50m

  Time is DERIVED and read-only. That's the point: the potter supplies
  rate/target/hold (what a shared schedule is written in and what they'd key
  into the kiln) and the app does the arithmetic. In the Minutes table that
  arrow points the other way — "minute 300" is something you must calculate
  before you can type it, and it's wrong as soon as an earlier rate changes.

  Conventions borrowed from the controllers (Bartlett/Skutt/L&L):
    - Blank rate = FULL, as fast as the kiln will go.
    - Rates are always POSITIVE. Direction is implied by whether the target sits
      above or below the running temperature, so cooling needs no minus sign.
    - A flat pair of waypoints reads back as a hold on the preceding step, which
      is why a 6-point curve is usually 4 steps.

  G1 (°F): temps convert via displayTemp/toCelsius. RATES are a delta — ×9/5
  with NO +32 — so they use displayDelta. Getting that backwards is invisible
  and wrong by 32 degrees.

  LOOP GUARD: editing a cell emits new points; the parent echoes them back;
  rebuilding segments from that echo mid-keystroke would yank the cursor.
  `dirty` suppresses the inbound rebuild until focus leaves the table.
-->
<template>
  <div class="flex flex-col gap-2">

    <!-- Header — mirrors the Minutes table's header row -->
    <div class="grid grid-cols-[20px_1fr_1fr_1fr_28px] sm:grid-cols-[20px_1fr_1fr_1fr_72px_28px] gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint px-0.5">
      <span>#</span>
      <span>Rate {{ unitLabel }}/hr</span>
      <span>To {{ unitLabel }}</span>
      <span>Hold min</span>
      <span class="hidden sm:block text-right">Takes</span>
      <span />
    </div>

    <!-- Start row. NOT a step: no rate, no hold, no duration, nothing to
         delete. The label spans the # and Rate columns so it can't be misread
         as a rate value, and the input sits under "To" because that column is
         temperatures and this is one. A hairline separates it from the program. -->
    <div class="grid grid-cols-[20px_1fr_1fr_1fr_28px] sm:grid-cols-[20px_1fr_1fr_1fr_72px_28px] gap-2 items-center pb-2 mb-0.5 border-b border-parchment-3">
      <span class="col-span-2 text-[11px] font-semibold text-ink-muted text-right pr-0.5">Start from</span>
      <input
        :value="displayTemp(ambient)"
        type="number" inputmode="numeric" min="0" :max="maxInputTemp"
        class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
        @focus="dirty = true"
        @change="setAmbient(Number($event.target.value))"
        @blur="commitAndSettle"
      >
      <span />
      <span class="hidden sm:block" />
      <span />
    </div>

    <!-- Step rows -->
    <div
      v-for="(seg, i) in segments" :key="'seg' + i"
      class="grid grid-cols-[20px_1fr_1fr_1fr_28px] sm:grid-cols-[20px_1fr_1fr_1fr_72px_28px] gap-2 items-center"
    >
      <span class="text-[11px] text-ink-faint text-center tabular-nums">{{ i + 1 }}</span>

      <input
        :value="seg.rate >= FULL_RATE ? '' : displayDelta(seg.rate)"
        type="number" inputmode="numeric" min="1" placeholder="Full"
        class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
        @focus="dirty = true"
        @change="setField(i, 'rate', $event.target.value === '' ? FULL_RATE : toRateC(Number($event.target.value)))"
        @blur="commitAndSettle"
      >

      <div class="relative">
        <input
          :value="displayTemp(seg.target)"
          type="number" inputmode="numeric" min="0" :max="maxInputTemp"
          class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 pr-6 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
          @focus="dirty = true"
          @change="setField(i, 'target', toCelsius(Number($event.target.value)))"
          @blur="commitAndSettle"
        >
        <!-- Direction is implied by the target, so show it rather than ask for it -->
        <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none" :class="isCooling(i) ? 'text-cobalt' : 'text-ink-faint'">
          {{ isCooling(i) ? '↓' : '↑' }}
        </span>
      </div>

      <input
        :value="seg.hold"
        type="number" inputmode="numeric" min="0" placeholder="0"
        class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
        @focus="dirty = true"
        @change="setField(i, 'hold', Number($event.target.value))"
        @blur="commitAndSettle"
      >

      <span class="hidden sm:block text-[11px] text-ink-muted text-right tabular-nums" :title="`Ends ${formatMins(cumulativeMins(i))} in`">
        {{ formatMins(rowMins(i)) }}
      </span>

      <button class="text-parchment-4 hover:text-red-400 transition-colors text-sm" title="Remove step" @click="removeSegment(i)">✕</button>
    </div>

    <p v-if="!segments.length" class="text-xs text-ink-muted px-1 py-3 text-center border border-dashed border-parchment-3 rounded-xl">
      No steps yet — add one, or start from a preset below.
    </p>

    <div class="flex items-center justify-between gap-2">
      <button class="text-sm text-flame hover:text-flame-dark font-semibold" @click="addSegment">+ Add step</button>
      <span v-if="segments.length" class="text-[11px] text-ink-faint tabular-nums">Total {{ formatMins(totalMins) }}</span>
    </div>

    <!-- Quick starts — only on an empty curve, where a blank grid is the most
         intimidating thing in the app. -->
    <div v-if="!segments.length" class="flex flex-wrap gap-2 pt-0.5">
      <button
        v-for="q in QUICK_STARTS" :key="q.label"
        class="px-3 py-1.5 rounded-full border border-parchment-3 bg-white text-xs font-semibold text-ink-muted hover:border-flame/50 hover:text-ink transition-colors"
        @click="applyQuickStart(q)"
      >{{ q.label }}</button>
    </div>

    <p v-else class="text-[11px] text-ink-faint leading-snug px-1">
      <strong class="font-semibold text-ink-muted">Start from</strong> is your kiln's temperature when you begin — usually room temperature.
      Leave a rate blank for full speed. Rates are always positive, so a target below the previous step cools.
    </p>

  </div>
</template>

<script setup>
// app/components/ScheduleSegmentEditor.vue
import { pointsToSegments, segmentsToPoints, segmentMinutes, formatMins, FULL_RATE } from '~/composables/useCurveSegments'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },   // [{ offsetMinutes, targetTemp }] °C
})
const emit = defineEmits(['update:modelValue'])

const { displayTemp, toCelsius, displayDelta, unitLabel, maxInputTemp } = useTempUnit()

// displayDelta handles °C→°F for a rate (×9/5, no offset). This is its inverse,
// for a rate the user just typed. Derived from displayDelta so this component
// never needs to know which unit is active.
const rateScale = computed(() => displayDelta(100) / 100)
const toRateC   = d => Math.round(d / rateScale.value)

const ambient   = ref(20)
const startMins = ref(0)
const segments  = ref([])
const dirty     = ref(false)   // true while the user is mid-edit

function rebuild(points) {
  const parsed = pointsToSegments(points)
  ambient.value   = parsed.ambient
  startMins.value = parsed.startMins
  segments.value  = parsed.segments
}
rebuild(props.modelValue)

watch(() => props.modelValue, (val) => {
  if (dirty.value) return      // never rebuild under the user's cursor
  rebuild(val)
}, { deep: true })

function commit() {
  emit('update:modelValue', segmentsToPoints(ambient.value, segments.value, startMins.value))
}

// Blur → push the change, then allow inbound rebuilds again on the next tick,
// after the parent has echoed our own points back down.
function commitAndSettle() {
  commit()
  nextTick(() => { dirty.value = false })
}

function setAmbient(displayVal) {
  ambient.value = toCelsius(displayVal)
  commit()
}

function setField(i, field, val) {
  if (!segments.value[i]) return
  segments.value[i][field] = Number.isFinite(val) ? val : 0
  commit()
}

// The temperature a step starts from — the previous step's target.
function fromTempAt(i) {
  return i === 0 ? ambient.value : segments.value[i - 1].target
}
function isCooling(i) {
  return segments.value[i].target < fromTempAt(i)
}
function rowMins(i) {
  return segmentMinutes(fromTempAt(i), segments.value[i])
}
function cumulativeMins(i) {
  let t = startMins.value
  for (let k = 0; k <= i; k++) t += rowMins(k)
  return t
}
const totalMins = computed(() => segments.value.length ? cumulativeMins(segments.value.length - 1) : 0)

function addSegment() {
  const last = segments.value[segments.value.length - 1]
  const from = last ? last.target : ambient.value
  segments.value.push({ rate: 100, target: from + 200, hold: 0 })
  commit()
}

function removeSegment(i) {
  segments.value.splice(i, 1)
  commit()
}

// Rate/target in °C; the display layer converts. Deliberately short — these are
// scaffolding to get someone off a blank grid, not opinions about their kiln.
const QUICK_STARTS = [
  {
    label: 'Bisque · cone 06',
    ambient: 20,
    segments: [
      { rate: 60,  target: 120,  hold: 0 },    // candle off the water
      { rate: 100, target: 600,  hold: 0 },
      { rate: 150, target: 999,  hold: 10 },
      { rate: 200, target: 80,   hold: 0 },
    ],
  },
  {
    label: 'Glaze · cone 6',
    ambient: 20,
    segments: [
      { rate: 120, target: 200,  hold: 0 },
      { rate: 180, target: 1100, hold: 0 },
      { rate: 60,  target: 1222, hold: 15 },
      { rate: 100, target: 100,  hold: 0 },
    ],
  },
  {
    label: 'Single ramp to 1000°',
    ambient: 20,
    segments: [{ rate: 150, target: 1000, hold: 0 }],
  },
]

function applyQuickStart(q) {
  ambient.value  = q.ambient
  segments.value = q.segments.map(s => ({ ...s }))
  commit()
}
</script>