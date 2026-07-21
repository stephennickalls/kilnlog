<!-- app/components/FiringConsole.vue -->
<!--
  Live firing console, built around the current-vs-target comparison. Delta colour
  encodes state (blue=behind, amber=ahead, CELADON=on track). Desktop (lg+): compact
  row. Below lg: tight strip.

  BRAND (Option B): the current/target card is the app's one persistent ink+glow
  surface — ink ground with a flame radial wash, echoing the landing page's
  "Firing insight" tile and the beta banner. State colours shift to their LIGHT
  variants on this surface (celadon-light / amber-400 / blue-400) so the
  on-track language stays legible; the delta chip keeps its light state-pill
  styling for maximum pop. The rate card (desktop) stays white, so rate colour
  needs BOTH palettes: rateColorClass (light surface) + rateColorClassDark
  (ink surface, mobile strip).

  Mobile layout (iPhone-width): the compact strip is TWO siblings —
    [ pill: text zone + LOG ]  [ standalone ⋮ menu ]
  The menu lives OUTSIDE the overflow-hidden pill, so LOG can no longer overlap it,
  and the text zone (flex-1, min-w-0, overflow-hidden) truncates instead of sliding
  under the buttons. Info stack in the text zone: hero Current → status line
  "target N° · Δ" → rate. The arrow glyph is dropped on mobile to reclaim width.
  "Readings" is desktop-only (not needed live on a phone).

  Mobile menu: a Teleported bottom sheet (can't be clipped); desktop keeps its
  anchored dropdown with a backdrop for outside-click.

  G11: the overflow menu gains a reduction toggle — "Start reduction" when none is
  open, "End reduction" when one is in progress. Emits a single 'reduction' action;
  the parent captures the current temperature and calls the API.

  G1 (°F): currentTemp / targetTemp arrive as raw °C numbers and are converted
  for display via useTempUnit. The on-track / ahead / behind comparison stays in
  °C (both operands °C), and the difference shown to the user is converted with
  displayDelta (a delta has no +32 offset). Rate colour reads the raw °C rate
  props (rateC / targetRateC) instead of re-parsing formatted strings.
-->
<template>
  <div class="flex flex-col gap-2">

    <!-- ─────────────── Desktop (lg+) ─────────────── -->
    <div class="hidden lg:flex gap-2 items-stretch">

      <!-- BRAND: ink + flame glow (was bg-white border-parchment-3) -->
      <div
        class="bg-ink border border-white/10 rounded-xl flex items-center gap-5 px-5 py-2"
        style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 22% 45%, rgba(184,85,28,0.35) 0%, transparent 62%)"
      >
        <button class="flex items-end gap-5 text-left" @click="$emit('open-temp')">
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Current</div>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentDisplay ?? '—' }}</span>
              <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4/50'">{{ unitLabel }}</span>
            </div>
          </div>
          <template v-if="targetTemp !== null">
            <svg class="w-4 h-4 mb-1.5 shrink-0" :class="delta ? delta.textClass : 'text-parchment-4/60'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Target</div>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-bold tabular-nums leading-none text-parchment-4">{{ targetTemp }}</span>
                <span class="text-sm font-medium text-parchment-4/70">{{ unitLabel }}</span>
              </div>
            </div>
          </template>
        </button>

        <!-- Light state pill — deliberately unchanged so state reads loudest on the ink -->
        <div v-if="delta" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold shrink-0" :class="delta.class">
          <span>{{ delta.icon }}</span> {{ delta.label }}
        </div>
      </div>

      <div class="bg-white border border-parchment-3 rounded-xl px-3 py-2 flex flex-col justify-center w-36 shrink-0" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Rate act</span>
          <span class="text-base font-bold tabular-nums" :class="rateColorClass">{{ rateOfChange }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">tgt</span>
          <span class="text-base font-bold tabular-nums text-ink-muted">{{ targetRate }}</span>
        </div>
        <div class="flex items-center justify-between border-t border-parchment-3 mt-1 pt-1">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Readings</span>
          <span class="text-base font-bold tabular-nums text-ink">{{ readingCount }}</span>
        </div>
      </div>

      <button v-if="isLive" class="w-28 shrink-0 bg-flame hover:bg-flame-dark active:bg-flame-dark text-parchment rounded-xl flex flex-col items-center justify-center gap-1 transition-colors" @click="$emit('log-reading')">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        <span class="text-xs font-bold uppercase tracking-wide">Log reading</span>
      </button>

      <div class="flex-1"/>

      <!-- Reduction in-progress chip (desktop) -->
      <div v-if="reductionOpen" class="self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"/> Reduction
      </div>

      <div class="relative shrink-0 flex">
        <button class="bg-white border border-parchment-3 rounded-xl flex items-center justify-center w-11 text-ink-muted hover:text-ink hover:border-flame/40 transition-colors" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)" @click="menuOpen = !menuOpen">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
        </button>

        <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />
        <div v-if="menuOpen" class="absolute right-0 top-full mt-2 w-52 z-50 bg-white border border-parchment-3 rounded-xl p-1.5 flex flex-col gap-0.5" style="box-shadow:0 4px 20px rgba(58,30,8,0.12)">
          <button v-if="isLive && !isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors text-left" @click="emitAction('pause')"><span class="text-base">⏸</span> Pause firing</button>
          <button v-if="isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-flame hover:bg-flame-bg transition-colors text-left" @click="emitAction('resume')"><span class="text-base">▶</span> Resume firing</button>
          <button v-if="isLive && !isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink hover:bg-flame-bg transition-colors text-left" @click="emitAction('recalibrate')"><span class="text-base">↻</span> Recalibrate</button>
          <!-- G11: reduction toggle -->
          <button v-if="isLive" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors text-left" @click="emitAction('reduction')">
            <span class="text-base">{{ reductionOpen ? '⊟' : '⊞' }}</span> {{ reductionOpen ? 'End reduction' : 'Start reduction' }}
          </button>
          <div class="h-px bg-parchment-3 my-0.5 mx-2"/>
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors text-left" @click="emitAction('end')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5.64 5.64a9 9 0 1012.72 0M12 3v9"/></svg>
            End firing
          </button>
        </div>
      </div>
    </div>

    <!-- ─────────────── Compact (below lg) ─────────────── -->
    <!-- Two siblings: the pill (text + LOG) and a standalone menu button. The
         menu is OUTSIDE the overflow-hidden pill so LOG cannot overlap it. -->
    <div class="lg:hidden flex items-stretch gap-2">

      <!-- Pill: text zone + LOG — BRAND ink+glow ground; LOG stays flame -->
      <div
        class="flex-1 min-w-0 bg-ink border border-white/10 rounded-2xl flex items-stretch overflow-hidden"
        style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 18% 40%, rgba(184,85,28,0.35) 0%, transparent 60%)"
      >
        <button class="flex-1 min-w-0 overflow-hidden px-3.5 py-3 text-left flex flex-col justify-center gap-1" @click="$emit('open-temp')">
          <!-- Hero: current temp -->
          <div class="flex items-baseline gap-1">
            <span class="text-[9px] font-semibold uppercase tracking-wide text-parchment-4/70 mr-0.5">Now</span>
            <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentDisplay ?? '—' }}</span>
            <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4/50'">{{ unitLabel }}</span>
          </div>

          <!-- Status line: target + delta (arrow dropped — reclaims width on narrow phones) -->
          <div v-if="targetTemp !== null" class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs text-parchment-4/80 whitespace-nowrap shrink-0">target <b class="font-bold text-parchment-3 tabular-nums">{{ targetTemp }}{{ unitLabel }}</b></span>
            <span v-if="delta" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 whitespace-nowrap" :class="delta.class">
              {{ delta.icon }} {{ delta.label }}
            </span>
          </div>

          <!-- Rate line -->
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-[11px] text-parchment-4/80 whitespace-nowrap">Rate <b class="font-bold" :class="rateColorClassDark">{{ rateShort }}</b><span class="text-parchment-4/50">/{{ targetRate }}</span></span>
            <span v-if="reductionOpen" class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 shrink-0"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>Reduction</span>
          </div>
        </button>

        <button v-if="isLive" class="w-[76px] shrink-0 bg-flame active:bg-flame-dark text-parchment flex flex-col items-center justify-center gap-1 transition-colors" @click="$emit('log-reading')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          <span class="text-[10px] font-bold uppercase">Log</span>
        </button>
      </div>

      <!-- Standalone menu (sheet teleported below to escape overflow-hidden) -->
      <button class="shrink-0 w-12 bg-white border border-parchment-3 rounded-2xl flex items-center justify-center text-ink-muted active:bg-parchment-2 transition-colors" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)" @click="menuOpen = !menuOpen">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
      </button>
    </div>

    <!-- Mobile overflow menu — bottom sheet (Teleported so overflow-hidden can't clip it) -->
    <Teleport to="body">
      <div v-if="menuOpen" class="lg:hidden fixed inset-0 z-[80] flex flex-col justify-end font-serif" style="background:rgba(26,18,8,0.6)" @click.self="menuOpen = false">
        <div class="bg-parchment rounded-t-2xl p-3 flex flex-col gap-2">
          <div class="flex justify-center pb-1"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
          <button v-if="isLive && !isPaused" class="w-full py-3 border border-amber-300 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl" @click="emitAction('pause')">⏸ Pause firing</button>
          <button v-if="isPaused" class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl active:bg-flame-dark" @click="emitAction('resume')">▶ Resume firing</button>
          <button v-if="isLive && !isPaused" class="w-full py-3 border border-flame/40 bg-flame-bg text-flame text-sm font-bold rounded-xl" @click="emitAction('recalibrate')">↻ Recalibrate</button>
          <button v-if="isLive" class="w-full py-3 border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl" @click="emitAction('reduction')">
            {{ reductionOpen ? '⊟ End reduction' : '⊞ Start reduction' }}
          </button>
          <button class="w-full py-3 border border-red-300 text-red-500 text-sm font-bold rounded-xl" @click="emitAction('end')">End firing</button>
          <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl mt-1" @click="menuOpen = false">Cancel</button>
        </div>
      </div>
    </Teleport>

    <!-- Paused banner -->
    <div v-if="isPaused" class="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
      ⏸ Paused — resume when your kiln is firing again
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  currentTemp:   { type: Number, default: null },   // raw °C
  targetTemp:    { type: Number, default: null },   // ALREADY in display unit (from useFiringStats)
  rateOfChange:  { type: String, default: '—' },    // formatted display string
  targetRate:    { type: String, default: '—' },    // formatted display string
  rateC:         { type: Number, default: null },   // raw °C/min (colour logic)
  targetRateC:   { type: Number, default: null },   // raw °C/min (colour logic)
  targetTempC:   { type: Number, default: null },   // raw °C (delta logic)
  readingCount:  { type: Number, default: 0 },
  isLive:        Boolean,
  isPaused:      Boolean,
  reductionOpen: { type: Boolean, default: false },   // G11
})

const emit = defineEmits(['open-temp', 'log-reading', 'pause', 'resume', 'recalibrate', 'end', 'reduction'])

const { displayTemp, displayDelta, unitLabel } = useTempUnit()

const menuOpen = ref(false)
function emitAction(name) { menuOpen.value = false; emit(name) }
watch(() => [props.isLive, props.isPaused], () => { menuOpen.value = false })

// Current temp converted for display (target arrives pre-converted from stats).
const currentDisplay = computed(() =>
  props.currentTemp === null ? null : displayTemp(props.currentTemp)
)

// Rate colour from raw °C rates — no string parsing. Thresholds are in °C/min;
// comparing two °C rates is unit-agnostic, so no conversion needed here.
// LIGHT-surface palette (desktop white rate card).
const rateColorClass = computed(() => {
  const actual = props.rateC
  const target = props.targetRateC
  if (actual === null) return 'text-ink-faint'
  if (target === null) return 'text-celadon'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-600'
  if (diff < -1.5) return 'text-blue-600'
  return 'text-celadon'
})

// BRAND: same logic, INK-surface palette (mobile strip lives on the ink card).
const rateColorClassDark = computed(() => {
  const actual = props.rateC
  const target = props.targetRateC
  if (actual === null) return 'text-parchment-4/60'
  if (target === null) return 'text-celadon-light'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-400'
  if (diff < -1.5) return 'text-blue-400'
  return 'text-celadon-light'
})

// Mobile short rate: strip the unit suffix from the formatted string.
const rateShort = computed(() =>
  (props.rateOfChange ?? '—').replace('°/m', '').replace('°C/m', '').replace('°F/m', '')
)

// BRAND: both hero-temp surfaces are ink now, so the state colours here are the
// light variants (delta.textClass below is dark-surface-tuned).
const currentColorClass = computed(() => {
  if (props.currentTemp === null) return 'text-parchment-4/50'
  if (!delta.value) return 'text-flame-light'
  return delta.value.textClass
})

// Delta computed in °C (both operands °C). The 15°C on-track window is a °C
// threshold and stays °C. The NUMBER shown to the user converts via displayDelta.
// `class` (the chip) keeps LIGHT state-pill styling — it pops hardest on ink.
// `textClass` is the on-ink text colour for the hero number + arrow.
const delta = computed(() => {
  if (props.currentTemp === null || props.targetTempC === null) return null
  const dC = Math.round(props.currentTemp - props.targetTempC)
  const absC = Math.abs(dC)
  const absDisplay = Math.abs(displayDelta(dC))
  if (absC <= 15) return { icon: '✓', label: 'On track', short: 'on track', class: 'bg-celadon-bg text-celadon-dark', textClass: 'text-celadon-light' }
  if (dC > 15)    return { icon: '↑', label: `${absDisplay}° ahead`, short: `${absDisplay}°`, class: 'bg-amber-50 text-amber-700', textClass: 'text-amber-400' }
  return { icon: '↓', label: `${absDisplay}° behind`, short: `${absDisplay}°`, class: 'bg-blue-50 text-blue-700', textClass: 'text-blue-400' }
})

defineExpose({ closeMenu: () => { menuOpen.value = false } })
</script>