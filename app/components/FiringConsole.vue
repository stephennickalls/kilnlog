<!-- app/components/FiringConsole.vue -->
<!--
  Live firing console. Wide: one compact row. Narrow: a tight strip.

  IT MEASURES ITSELF (Aug 2026). Every tier here used to switch on a Tailwind
  breakpoint — lg:flex / lg:hidden / md:flex — which reads the VIEWPORT. This
  console does not live in the viewport, it lives in a column beside a 280px
  sidebar that the user can open, close and drag. On a laptop at 1280px with the
  sidebar open, the column is ~960px while the viewport still says lg, so the
  full row rendered and overflowed: the ink card, a 144px rate card, three 112px
  buttons and the menu need a bit over 1000px of their own. main is
  overflow-hidden, so the result was the row silently cut off at the right edge
  and the chart squeezed under it.

  A ResizeObserver on the root gives the one number that actually decides the
  layout — how much room this component has — so the sidebar, its drag handle
  and the window all feed the same answer without app.vue computing anything.
  Container queries would do this in CSS, but they are not in the build.

  Thresholds are the measured cost of each tier plus a little slack. The full
  row's floor is ~810px, so it degrades in stages rather than collapsing:
    WIDE             840   full row: ink card + rate card + 3 buttons + menu
    WIDE_WITH_CHIP   940   + the ahead/behind chip
    WIDE_WITH_CONE  1090   + the Next cone block on the end
    CONE_BUTTONS     700   pill + standalone Cone down / Reduce beside it
  Below 700 those two actions fold into the ⋮ sheet. Demoting to the pill costs
  the potter the 112px buttons and the right-pushed ⋮, so it is the LAST step,
  not the first — dropping two readouts is cheaper than shrinking every control.
  Change a button width and these need remeasuring.

  FIRST PAINT is the narrow tier: there is no width on the server, and the
  observer fires on the frame after mount. A frame of the compact pill beats a
  frame of a broken row.

  MOBILE PILL, RANKED:
    line 1  current temp, big
    line 2  target temp + the ahead/behind chip
    line 3  actual rate against target rate
    line 4  atmosphere state and next transition (only when the plan has bands)

  That order is the whole question a potter asks at the kiln: where am I, where
  should I be, and am I closing the gap. What used to sit in those lines and no
  longer does:

    NEXT CONE + ETA — gone from the pill. The ETA ("~11 min at this rate") is a
    projection off a rate that changes the moment you touch a damper, so it is
    the first number on the pill to be wrong. It survives on the wide tier where
    there is room to ignore it. The cone itself is on the chart's ruler with a
    mark where it actually dropped — a record rather than a guess.

    "LIVE" beside the delta chip — gone. It meant "a reduction is open", but sat
    next to the on-track tick where it read as "the firing is live", which is
    never in question on a screen showing a rising temperature.

    RATE, promoted off line 1. A rate alone says nothing — +1°C/m is quick for a
    bisque and slow for the last push to cone 10 — so it now sits against target
    on its own line, with the colour carrying the comparison.

  BRAND: the hero card is ink with a flame radial glow, so state colours use
  their LIGHT variants there; the delta chip keeps light state-pill styling.
  The rate card is white, hence two rate palettes.

  UNITS: currentTemp / targetTempC are raw °C. The on-track window is ±15°C and
  stays °C; the number shown converts via displayDelta.

  The ⋮ menu on the narrow tier is a Teleported sheet outside the
  overflow-hidden pill, padded past the home indicator, capped in dvh. On-track
  renders as a bare tick at every narrow width (delta.iconOnly) since it has no
  shorter form; ahead and behind fall back to delta.short below 380px.
-->
<template>
  <div ref="rootEl" class="flex flex-col gap-2 min-w-0">

    <!-- ─────────────── Wide tier ─────────────── -->
    <!-- min-w-0 throughout: without it a flex child refuses to shrink below its
         content and pushes the row past the column instead of squeezing. -->
    <div v-if="wide" class="flex gap-2 items-stretch min-w-0">

      <div
        class="bg-ink border border-white/10 rounded-xl flex items-center gap-5 px-5 py-2 min-w-0"
        style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 22% 45%, rgba(184,85,28,0.35) 0%, transparent 62%)"
      >
        <button class="flex items-end gap-5 text-left min-w-0" @click="$emit('open-temp')">
          <div class="min-w-0">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Current</div>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentDisplay ?? '—' }}</span>
              <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4/50'">{{ unitLabel }}</span>
            </div>
          </div>
          <template v-if="targetTemp !== null">
            <svg class="w-4 h-4 mb-1.5 shrink-0" :class="delta ? delta.textClass : 'text-parchment-4/60'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div class="min-w-0">
              <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Target</div>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-bold tabular-nums leading-none text-parchment-4">{{ targetTemp }}</span>
                <span class="text-sm font-medium text-parchment-4/70">{{ unitLabel }}</span>
              </div>
            </div>
          </template>

          <!-- First thing to go when the column tightens, because it is the
               least certain number on the console. -->
          <div v-if="coneInfo && wideWithCone" class="pl-4 border-l border-white/10 min-w-0">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Next cone</div>
            <div class="flex items-baseline gap-1.5">
              <svg class="w-4 h-4 self-center shrink-0 text-celadon-light" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
              <span class="text-2xl font-bold tabular-nums leading-none text-celadon-light">{{ coneInfo.name }}</span>
              <span class="text-xs font-medium text-parchment-4/70 tabular-nums">{{ coneInfo.tempLabel }}</span>
            </div>
            <div v-if="coneInfo.eta" class="text-[11px] font-semibold text-celadon-light/90 tabular-nums whitespace-nowrap">{{ coneInfo.eta }}</div>
          </div>
        </button>

        <!-- Second thing to go. The pill's own delta chip still carries this
             once the row demotes, and the ahead/behind colour is already on the
             Current number, so nothing is lost outright. -->
        <div v-if="delta && wideWithChip" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold shrink-0 whitespace-nowrap" :class="delta.class">
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

      <!-- The filled glyph is the same mark the chart draws at each drop. -->
      <button
        v-if="isLive"
        class="w-28 shrink-0 bg-celadon hover:bg-celadon-dark active:bg-celadon-dark text-white rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('cone-drop')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
        <span class="text-xs font-bold uppercase tracking-wide">Cone down</span>
      </button>

      <button
        v-if="isLive"
        class="w-28 shrink-0 bg-cobalt hover:bg-cobalt-dark active:bg-cobalt-dark text-white rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('reduction')"
      >
        <span class="text-xl leading-none flex items-center gap-1.5">
          <span v-if="reductionOpen" class="w-2 h-2 rounded-full bg-white animate-pulse"/>{{ reductionOpen ? '⊟' : '⊞' }}
        </span>
        <span class="text-xs font-bold uppercase tracking-wide">{{ reductionOpen ? 'End reduction' : 'Reduction' }}</span>
      </button>

      <div class="flex-1"/>

      <div class="relative shrink-0 flex">
        <button class="bg-white border border-parchment-3 rounded-xl flex items-center justify-center w-11 text-ink-muted hover:text-ink hover:border-flame/40 transition-colors" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)" @click="menuOpen = !menuOpen">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
        </button>

        <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />
        <div v-if="menuOpen" class="absolute right-0 top-full mt-2 w-52 z-50 bg-white border border-parchment-3 rounded-xl p-1.5 flex flex-col gap-0.5" style="box-shadow:0 4px 20px rgba(58,30,8,0.12)">
          <!-- No cone or reduction entries on this tier: both are buttons above. -->
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink hover:bg-parchment-2 transition-colors text-left" @click="emitAction('readings')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            Edit readings
          </button>
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink hover:bg-parchment-2 transition-colors text-left" @click="emitAction('notes')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
            Notes
          </button>
          <button v-if="isLive && !isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-muted hover:bg-parchment-2 transition-colors text-left" @click="emitAction('recalibrate')"><span class="text-base">↻</span> Recalibrate</button>
          <button v-if="isLive && !isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-muted hover:bg-parchment-2 transition-colors text-left" @click="emitAction('pause')"><span class="text-base">⏸</span> Pause firing</button>
          <button v-if="isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-flame hover:bg-flame-bg transition-colors text-left" @click="emitAction('resume')"><span class="text-base">▶</span> Resume firing</button>
          <div class="h-px bg-parchment-3 my-0.5 mx-2"/>
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors text-left" @click="emitAction('end')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5.64 5.64a9 9 0 1012.72 0M12 3v9"/></svg>
            End firing
          </button>
        </div>
      </div>
    </div>

    <!-- ─────────────── Narrow tier ─────────────── -->
    <div v-else class="flex items-stretch gap-2 min-w-0">

      <div
        class="flex-1 min-w-0 bg-ink border border-white/10 rounded-2xl flex items-stretch overflow-hidden"
        :class="coneButtonsFit ? 'max-w-[460px]' : ''"
        style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 18% 40%, rgba(184,85,28,0.35) 0%, transparent 60%)"
      >
        <button class="flex-1 min-w-0 overflow-hidden px-3.5 py-3 text-left flex flex-col justify-center gap-1" @click="$emit('open-temp')">

          <!-- 1. Where am I -->
          <div class="flex items-baseline gap-1 min-w-0">
            <span class="text-[9px] font-semibold uppercase tracking-wide text-parchment-4/70 mr-0.5">Now</span>
            <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentDisplay ?? '—' }}</span>
            <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4/50'">{{ unitLabel }}</span>
          </div>

          <!-- 2. Where should I be -->
          <div v-if="targetTemp !== null" class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs text-parchment-4/80 whitespace-nowrap truncate min-w-0">target <b class="font-bold text-parchment-3 tabular-nums">{{ targetTemp }}{{ unitLabel }}</b></span>
            <span v-if="delta" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 whitespace-nowrap" :class="delta.class">
              {{ delta.icon }}
              <template v-if="!delta.iconOnly">
                <span class="min-[380px]:hidden">{{ delta.short }}</span>
                <span class="hidden min-[380px]:inline">{{ delta.label }}</span>
              </template>
            </span>
          </div>

          <!-- 3. Am I closing the gap. A rate on its own means nothing, so the
               target sits beside it and the colour carries the comparison. -->
          <div class="flex items-baseline gap-1.5 min-w-0">
            <span class="text-[9px] font-semibold uppercase tracking-wide text-parchment-4/70 shrink-0">Rate</span>
            <span class="text-xs font-bold tabular-nums shrink-0" :class="rateColorClassDark">{{ rateOfChange }}</span>
            <span class="text-[11px] text-parchment-4/70 tabular-nums truncate min-w-0">tgt {{ targetRate }}</span>
          </div>

          <!-- 4. Atmosphere. nextLabel is why this survives: "reduce from cone
               010 · 894°" is an instruction, not a status. -->
          <div v-if="atmosphereInfo" class="flex items-center gap-1.5 min-w-0 mt-0.5">
            <span v-if="atmosphereInfo.stateLabel" class="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0" :class="atmosphereInfo.stateClass">{{ atmosphereInfo.stateLabel }}</span>
            <span v-if="atmosphereInfo.nextLabel" class="text-[11px] text-parchment-4/80 truncate min-w-0">{{ atmosphereInfo.nextLabel }}</span>
          </div>
        </button>

        <button v-if="isLive" class="w-[76px] shrink-0 bg-flame active:bg-flame-dark text-parchment flex flex-col items-center justify-center gap-1 transition-colors" @click="$emit('log-reading')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          <span class="text-[10px] font-bold uppercase">Log</span>
        </button>
      </div>

      <button
        v-if="isLive && coneButtonsFit"
        class="flex shrink-0 w-[88px] bg-celadon active:bg-celadon-dark text-white rounded-2xl flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('cone-drop')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
        <span class="text-[10px] font-bold uppercase">Cone down</span>
      </button>

      <button
        v-if="isLive && coneButtonsFit"
        class="flex shrink-0 w-[88px] bg-cobalt active:bg-cobalt-dark text-white rounded-2xl flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('reduction')"
      >
        <span class="text-base leading-none flex items-center gap-1">
          <span v-if="reductionOpen" class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>{{ reductionOpen ? '⊟' : '⊞' }}
        </span>
        <span class="text-[10px] font-bold uppercase">{{ reductionOpen ? 'End red.' : 'Reduce' }}</span>
      </button>

      <button class="shrink-0 w-12 bg-white border border-parchment-3 rounded-2xl flex items-center justify-center text-ink-muted active:bg-parchment-2 transition-colors" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)" @click="menuOpen = !menuOpen">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="menuOpen && !wide" class="fixed inset-0 z-[80] flex flex-col justify-end font-serif" style="background:rgba(26,18,8,0.6)" @click.self="menuOpen = false">
        <div
          class="bg-parchment rounded-t-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 overflow-y-auto"
          style="max-height:85vh; max-height:min(85vh, 85dvh)"
        >
          <div class="flex justify-center pb-1"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
          <!-- Firing events are loud solids (celadon heat-work, cobalt
               atmosphere); utilities silent white. Cone and reduction entries
               hide when the standalone buttons fit beside the pill. -->
          <button v-if="isLive && !coneButtonsFit" class="w-full py-3 bg-celadon active:bg-celadon-dark text-white text-sm font-bold rounded-xl transition-colors" @click="emitAction('cone-drop')">
            <svg class="w-4 h-4 inline -mt-0.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>Cone down
          </button>
          <button v-if="isLive && !coneButtonsFit" class="w-full py-3 bg-cobalt active:bg-cobalt-dark text-white text-sm font-bold rounded-xl transition-colors" @click="emitAction('reduction')">
            {{ reductionOpen ? '⊟ End reduction' : '⊞ Start reduction' }}
          </button>
          <button class="w-full py-3 border border-parchment-3 bg-white text-ink text-sm font-bold rounded-xl" @click="emitAction('readings')">
            <svg class="w-4 h-4 inline -mt-0.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>Edit readings
          </button>
          <button class="w-full py-3 border border-parchment-3 bg-white text-ink text-sm font-bold rounded-xl" @click="emitAction('notes')">
            <svg class="w-4 h-4 inline -mt-0.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>Notes
          </button>
          <button v-if="isLive && !isPaused" class="w-full py-3 border border-parchment-3 bg-white text-ink-muted text-sm font-bold rounded-xl" @click="emitAction('recalibrate')">↻ Recalibrate</button>
          <button v-if="isLive && !isPaused" class="w-full py-3 border border-parchment-3 bg-white text-ink-muted text-sm font-bold rounded-xl" @click="emitAction('pause')">⏸ Pause firing</button>
          <button v-if="isPaused" class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl active:bg-flame-dark" @click="emitAction('resume')">▶ Resume firing</button>
          <button class="w-full py-3 border border-red-300 text-red-500 text-sm font-bold rounded-xl" @click="emitAction('end')">End firing</button>
          <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl mt-1" @click="menuOpen = false">Cancel</button>
        </div>
      </div>
    </Teleport>

    <div v-if="isPaused" class="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
      ⏸ Paused — resume when your kiln is firing again
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  currentTemp:   { type: Number, default: null },   // raw °C
  targetTemp:    { type: Number, default: null },   // already in display unit
  rateOfChange:  { type: String, default: '—' },
  targetRate:    { type: String, default: '—' },
  rateC:         { type: Number, default: null },   // raw °C/min
  targetRateC:   { type: Number, default: null },   // raw °C/min
  targetTempC:   { type: Number, default: null },   // raw °C
  readingCount:  { type: Number, default: 0 },
  isLive:        Boolean,
  isPaused:      Boolean,
  reductionOpen: { type: Boolean, default: false },
  nextCone:      { type: Object, default: null },   // { name, tempC, etaMinutes|null }
  atmosphere:    { type: Object, default: null },   // { state, next }
})

const emit = defineEmits(['open-temp', 'log-reading', 'pause', 'resume', 'recalibrate', 'end', 'reduction', 'notes', 'cone-drop', 'readings'])

const { displayTemp, displayDelta, unitLabel } = useTempUnit()

// ── Self-measurement ─────────────────────────────────────────────────────────
// See the header note. These are the measured costs of each tier in this
// component's own column, not viewport breakpoints — the sidebar sits between
// the two.
//
// The full row's floor is ~810px: ink card at its minimum (~246) + 144 rate
// card + three 112 buttons + 44 menu + gaps. The delta chip (~108) and the Next
// cone block (~150) are what push it past that, so they drop out one at a time
// BEFORE the row gives way to the pill. Demoting to the pill costs the potter
// the big buttons and the right-pushed menu, so it should be the last resort,
// not the first — 1040 here was too eager and demoted a 960px column that could
// have carried the row comfortably.
//
// Remeasure these if a button width, the rate card or the chip text changes.
const WIDE            = 840    // full row, no chip, no cone block
const WIDE_WITH_CHIP  = 940    // + the ahead/behind chip
const WIDE_WITH_CONE  = 1090   // + Next cone and its ETA
const CONE_BUTTONS    = 700    // pill + standalone Cone down / Reduce beside it

const rootEl = ref(null)
const availW = ref(0)     // 0 until measured, so first paint is the narrow tier

let ro = null
onMounted(() => {
  if (!rootEl.value || typeof ResizeObserver === 'undefined') {
    // No observer (very old browser, or SSR-only render): fall back to the
    // window so the wide tier is at least reachable.
    availW.value = typeof window !== 'undefined' ? window.innerWidth : 0
    return
  }
  ro = new ResizeObserver(([entry]) => {
    availW.value = Math.round(entry.contentRect.width)
  })
  ro.observe(rootEl.value)
})
onBeforeUnmount(() => { ro?.disconnect(); ro = null })

const wide           = computed(() => availW.value >= WIDE)
const wideWithChip   = computed(() => availW.value >= WIDE_WITH_CHIP)
const wideWithCone   = computed(() => availW.value >= WIDE_WITH_CONE)
const coneButtonsFit = computed(() => availW.value >= CONE_BUTTONS)

// Crossing a tier boundary with the menu open would leave a sheet and a
// dropdown fighting over the same state.
watch(wide, () => { menuOpen.value = false })

const menuOpen = ref(false)
function emitAction(name) { menuOpen.value = false; emit(name) }
watch(() => [props.isLive, props.isPaused], () => { menuOpen.value = false })

const currentDisplay = computed(() =>
  props.currentTemp === null ? null : displayTemp(props.currentTemp)
)

// Wide tier only. The ETA is an estimate against the cone's ~60C/hr rating and
// is never authoritative over the witness cone, hence the "~" and "at this rate".
const coneInfo = computed(() => {
  const c = props.nextCone
  if (!c) return null
  return {
    name: c.name,
    tempLabel: `${displayTemp(c.tempC)}°`,
    eta: c.etaMinutes == null ? null : `~${c.etaMinutes} min at this rate`,
  }
})

// Read only by the narrow pill, so there is no light-background variant.
// stateLabel is null when neutral, which is most of a firing — the pill shows
// nothing rather than announcing it.
const atmosphereInfo = computed(() => {
  const a = props.atmosphere
  if (!a) return null
  const verb = a.next?.kind === 'oxidation' ? 'oxidise' : 'reduce'
  return {
    stateLabel: a.state ? a.state.toUpperCase() : null,
    stateClass: a.state === 'oxidation' ? 'bg-amber-400/20 text-amber-300' : 'bg-cobalt/40 text-cobalt-light',
    nextLabel: a.next
      ? `${verb} from ${a.next.cone ? `cone ${a.next.cone} · ` : ''}${displayTemp(a.next.tempC)}°`
      : null,
  }
})

// Thresholds are °C/min; comparing two °C rates needs no conversion.
const rateColorClass = computed(() => {
  const actual = props.rateC, target = props.targetRateC
  if (actual === null) return 'text-ink-faint'
  if (target === null) return 'text-celadon'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-600'
  if (diff < -1.5) return 'text-blue-600'
  return 'text-celadon'
})

const rateColorClassDark = computed(() => {
  const actual = props.rateC, target = props.targetRateC
  if (actual === null) return 'text-parchment-4/60'
  if (target === null) return 'text-celadon-light'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-400'
  if (diff < -1.5) return 'text-blue-400'
  return 'text-celadon-light'
})

const currentColorClass = computed(() => {
  if (props.currentTemp === null) return 'text-parchment-4/50'
  if (!delta.value) return 'text-flame-light'
  return delta.value.textClass
})

// Computed in °C; the ±15 window is a °C threshold. iconOnly is read only by
// the narrow status line, where on-track renders as a bare tick.
const delta = computed(() => {
  if (props.currentTemp === null || props.targetTempC === null) return null
  const dC = Math.round(props.currentTemp - props.targetTempC)
  const absDisplay = Math.abs(displayDelta(dC))
  if (Math.abs(dC) <= 15) return { icon: '✓', label: 'On track', short: 'on track', iconOnly: true, class: 'bg-celadon-bg text-celadon-dark', textClass: 'text-celadon-light' }
  if (dC > 15) return { icon: '↑', label: `${absDisplay}° ahead`, short: `${absDisplay}°`, class: 'bg-amber-50 text-amber-700', textClass: 'text-amber-400' }
  return { icon: '↓', label: `${absDisplay}° behind`, short: `${absDisplay}°`, class: 'bg-blue-50 text-blue-700', textClass: 'text-blue-400' }
})

defineExpose({ closeMenu: () => { menuOpen.value = false } })
</script>