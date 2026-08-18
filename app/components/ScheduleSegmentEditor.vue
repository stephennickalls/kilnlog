<!-- app/components/ScheduleSegmentEditor.vue -->
<!--
  The "Steps" view of a schedule — a TABLE, same grid/header/input styling as
  the Minutes table it sits beside, so switching views doesn't feel like
  switching apps.

  v-models the SAME [{ offsetMinutes, targetTemp }] array (°C) the curve editor
  and the Minutes table use. It's a lens over the stored model, not a second
  model, so graph / Steps / Minutes stay in sync automatically.

  Each row is one line of a kiln-controller program:

      #   Rate °C/hr   To °C   Hold   Takes
      1   60           100     30     1h 50m
      2   100          600     —      5h
      3   150          999     10     2h 50m

  Time is DERIVED and read-only. That's the point: the potter supplies
  rate/target/hold (what a shared schedule is written in and what they'd key
  into the kiln) and the app does the arithmetic. In the Minutes table that
  arrow points the other way — "minute 300" is something you must calculate
  before you can type it, and it's wrong as soon as an earlier rate changes.

  START TEMPERATURE IS NOT IN THE TABLE (Aug 2026). It used to be a row between
  the header and step 1, borrowing the table's grid with its input sitting under
  "To". Three things went wrong with that: the eye hit a non-step before the
  first step, column alignment implied it was part of the program, and a
  right-aligned "Start from" label in the Rate column read as a rate. It is now
  a single labelled control above the table, and NOTHING SHARES THAT LINE — a
  first attempt put peak and total time on the right of it, and at 320px a
  wrapping flex row with a number input in it collided into an unreadable mess.
  Total time stays at the foot of the table where a total belongs.

  READING IT AT A GLANCE. Eight identical number inputs are unscannable, so the
  row number carries the shape of the firing in colour: flame at the peak step,
  cobalt on any cooling step, muted while climbing. Cooling rows also take a
  faint cobalt wash, which makes a fire-down visible without reading a single
  number. Zero holds render blank rather than "0", because a column of zeros
  looks like data when it means "nothing here".

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

    <!-- ── Start temperature ───────────────────────────────────────────────
         Outside the grid on purpose (see header comment). One control, left
         aligned, hairline under it — nothing else lives here, because anything
         sharing the line has to survive 320px next to a number input. -->
    <div class="flex items-center gap-2 pb-2.5 border-b border-parchment-3">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint shrink-0">Start from</span>
      <input
        :value="displayTemp(ambient)"
        type="number" inputmode="numeric" min="0" :max="maxInputTemp"
        class="w-16 shrink-0 border border-parchment-3 rounded-lg px-2.5 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
        @focus="dirty = true"
        @change="setAmbient(Number($event.target.value))"
        @blur="commitAndSettle"
      >
      <span class="text-[11px] text-ink-muted shrink-0">{{ unitLabel }}</span>
    </div>

    <!-- Header — mirrors the Minutes table's header row. No horizontal padding:
         the row wrapper's -mx-1/px-1 cancel out, so anything here shifts the
         header off its own columns. -->
    <div :class="GRID" class="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
      <span>#</span>
      <span>Rate {{ unitLabel }}/hr</span>
      <span>To {{ unitLabel }}</span>
      <span>Hold min</span>
      <span class="hidden sm:block text-right">Takes</span>
      <span />
    </div>

    <!-- ── Step rows ──────────────────────────────────────────────────────
         The wrapper exists so a cooling step can take a wash without the
         padding shifting the grid columns out of line with the header. -->
    <div
      v-for="(seg, i) in segments" :key="'seg' + i"
      class="rounded-lg -mx-1 px-1 py-0.5 transition-colors"
      :class="isCooling(i) ? 'bg-cobalt-bg/50' : ''"
    >
      <div :class="GRID" class="items-center">
        <!-- Colour here is the whole scanning story: where the firing peaks
             and where it turns around, without reading a number. -->
        <span
          class="text-[11px] text-center tabular-nums font-bold"
          :class="isPeak(i) ? 'text-flame' : isCooling(i) ? 'text-cobalt' : 'text-ink-muted'"
          :title="isPeak(i) ? 'Peak' : isCooling(i) ? 'Cooling' : 'Heating'"
        >{{ i + 1 }}</span>

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

        <!-- Blank, not "0". A column of zeros reads as data when it means
             "no hold here", and the placeholder still says what blank is. -->
        <input
          :value="seg.hold || ''"
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

      <!-- The Takes column doesn't fit on a phone, and duration is the most
           useful derived number in the table — so it moves under the row rather
           than disappearing. "Ends" was hover-only before, which is nothing on
           touch. -->
      <p class="sm:hidden pl-[28px] pt-1 text-[10px] text-ink-faint tabular-nums">
        Takes {{ formatMins(rowMins(i)) }} · ends {{ formatMins(cumulativeMins(i)) }}
      </p>
    </div>

    <p v-if="!segments.length" class="text-xs text-ink-muted px-1 py-3 text-center border border-dashed border-parchment-3 rounded-xl">
      No steps yet — add one, or start from a preset below.
    </p>

    <div class="flex items-center justify-between gap-2 pt-1">
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
      Leave a rate blank for full speed. Rates are always positive, so a target
      below the previous step cools — those rows are tinted blue.
    </p>

  </div>
</template>

<script setup>
// app/components/ScheduleSegmentEditor.vue
import { pointsToSegments, segmentsToPoints, segmentMinutes, formatMins, FULL_RATE } from '~/composables/useCurveSegments'
import { QUICK_STARTS, buildStarterSegments } from '~/composables/useStarterCurve'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },   // [{ offsetMinutes, targetTemp }] °C
})
const emit = defineEmits(['update:modelValue'])

const { displayTemp, toCelsius, displayDelta, unitLabel, maxInputTemp } = useTempUnit()

// ONE grid template, bound to both the header and every row. It was written out
// twice; the two drifted the moment anything touched one of them, and a header
// half a column off its inputs is the sort of thing you stare at for ten minutes
// before spotting.
//
// minmax(0,1fr) rather than 1fr is load-bearing. Plain `1fr` means
// minmax(AUTO,1fr) — a column silently refuses to shrink below its content's
// min-content width. The rows hold number inputs (which shrink fine) and the
// header holds words, so the instant the header's text is bigger than intended
// its columns grow past the rows' and the whole table looks knocked sideways.
// minmax(0,·) makes the column widths depend on the container alone.
const GRID = 'grid gap-2 grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_28px] sm:grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_28px]'

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

// The hottest target, and the FIRST step that reaches it — a hold following the
// peak shares the same target, and marking two rows as "the peak" would say
// nothing. Highest wins, so a schedule that never cools still marks its last
// climbing step.
const peakTemp  = computed(() => segments.value.length ? Math.max(...segments.value.map(s => s.target)) : ambient.value)
const peakIndex = computed(() => segments.value.findIndex(s => s.target === peakTemp.value))
function isPeak(i) {
  return i === peakIndex.value
}

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

// Quick starts run through the SAME profiles as the type+cone generator in
// useStarterCurve — this component used to carry its own hardcoded bisque and
// glaze, which is how the app ended up with three versions of "a reasonable
// bisque" that all disagreed.
function applyQuickStart(q) {
  const built = buildStarterSegments(q.type, q.peak)
  ambient.value  = built.ambient
  segments.value = built.segments.map(s => ({ ...s }))
  commit()
}
</script>