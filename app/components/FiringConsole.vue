<!-- app/components/FiringConsole.vue -->
<!--
  Live firing console, built around the current-vs-target comparison. Delta colour
  encodes state (blue=behind, amber=ahead, CELADON=on track). Desktop (lg+): compact
  row. Below lg: tight strip.

  G11: the overflow menu gains a reduction toggle — "Start reduction" when none is
  open, "End reduction" when one is in progress. Emits a single 'reduction' action;
  the parent captures the current temperature and calls the API.
-->
<template>
  <div class="flex flex-col gap-2">

    <!-- ─────────────── Desktop (lg+) ─────────────── -->
    <div class="hidden lg:flex gap-2 items-stretch">

      <div class="bg-white border border-parchment-3 rounded-xl flex items-center gap-5 px-5 py-2" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
        <button class="flex items-end gap-5 text-left" @click="$emit('open-temp')">
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Current</div>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentTemp !== null ? Math.round(currentTemp) : '—' }}</span>
              <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4'">°C</span>
            </div>
          </div>
          <template v-if="targetTemp !== null">
            <svg class="w-4 h-4 mb-1.5 shrink-0" :class="delta ? delta.textClass : 'text-ink-faint'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Target</div>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-bold tabular-nums leading-none text-parchment-4">{{ targetTemp }}</span>
                <span class="text-sm font-medium text-parchment-4">°C</span>
              </div>
            </div>
          </template>
        </button>

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
    <div class="lg:hidden bg-white border border-parchment-3 rounded-2xl flex items-stretch overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <button class="flex-1 min-w-0 px-3 py-2.5 text-left" @click="$emit('open-temp')">
        <div class="flex items-end gap-2.5">
          <div class="flex items-baseline gap-0.5">
            <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentTemp !== null ? Math.round(currentTemp) : '—' }}</span>
            <span class="text-xs text-ink-faint">°</span>
          </div>
          <template v-if="targetTemp !== null">
            <svg class="w-3.5 h-3.5 mb-1.5 shrink-0" :class="delta ? delta.textClass : 'text-ink-faint'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div class="flex items-baseline gap-0.5 mb-0.5">
              <span class="text-2xl font-bold tabular-nums leading-none text-parchment-4">{{ targetTemp }}</span>
              <span class="text-[10px] text-ink-faint">°</span>
            </div>
            <span v-if="delta" class="mb-1 inline-flex items-center gap-0.5 text-[11px] font-bold" :class="delta.textClass">{{ delta.icon }}{{ delta.short }}</span>
          </template>
        </div>
        <div class="flex gap-3.5 mt-1.5 items-center">
          <span class="text-[11px] text-ink-muted">Rate <b class="font-bold" :class="rateColorClass">{{ rateShort }}</b><span class="text-ink-faint">/{{ targetRate }}</span></span>
          <span class="text-[11px] text-ink-muted">Readings <b class="font-bold text-ink">{{ readingCount }}</b></span>
          <span v-if="reductionOpen" class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"/>Reduction</span>
        </div>
      </button>

      <button v-if="isLive" class="w-[88px] shrink-0 bg-flame active:bg-flame-dark text-parchment flex flex-col items-center justify-center gap-1 transition-colors" @click="$emit('log-reading')">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        <span class="text-[10px] font-bold uppercase">Log</span>
      </button>

      <div class="relative shrink-0 flex">
        <button class="w-10 bg-parchment-2/40 border-l border-parchment-3 flex items-center justify-center text-ink-muted active:bg-parchment-2" @click="menuOpen = !menuOpen">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
        </button>

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

    <!-- Paused banner -->
    <div v-if="isPaused" class="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
      ⏸ Paused — resume when your kiln is firing again
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  currentTemp:   { type: Number, default: null },
  targetTemp:    { type: Number, default: null },
  rateOfChange:  { type: String, default: '—' },
  targetRate:    { type: String, default: '—' },
  readingCount:  { type: Number, default: 0 },
  isLive:        Boolean,
  isPaused:      Boolean,
  reductionOpen: { type: Boolean, default: false },   // G11
})

const emit = defineEmits(['open-temp', 'log-reading', 'pause', 'resume', 'recalibrate', 'end', 'reduction'])

const menuOpen = ref(false)
function emitAction(name) { menuOpen.value = false; emit(name) }
watch(() => [props.isLive, props.isPaused], () => { menuOpen.value = false })

function parseRate(str) {
  if (!str || str === '—') return null
  const n = parseFloat(str.replace('°/m', ''))
  return isFinite(n) ? n : null
}

const rateColorClass = computed(() => {
  const actual = parseRate(props.rateOfChange)
  const target = parseRate(props.targetRate)
  if (actual === null) return 'text-ink-faint'
  if (target === null) return 'text-celadon'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-600'
  if (diff < -1.5) return 'text-blue-600'
  return 'text-celadon'
})

const rateShort = computed(() => (props.rateOfChange ?? '—').replace('°/m', ''))

const currentColorClass = computed(() => {
  if (props.currentTemp === null) return 'text-parchment-4'
  if (!delta.value) return 'text-flame'
  return delta.value.textClass
})

const delta = computed(() => {
  if (props.currentTemp === null || props.targetTemp === null) return null
  const d = Math.round(props.currentTemp - props.targetTemp)
  const abs = Math.abs(d)
  if (abs <= 15) return { icon: '✓', label: 'On track', short: 'on track', class: 'bg-celadon-bg text-celadon-dark', textClass: 'text-celadon' }
  if (d > 15)    return { icon: '↑', label: `${abs}° ahead`, short: `${abs}°`, class: 'bg-amber-50 text-amber-700', textClass: 'text-amber-600' }
  return { icon: '↓', label: `${abs}° behind`, short: `${abs}°`, class: 'bg-blue-50 text-blue-700', textClass: 'text-blue-600' }
})

defineExpose({ closeMenu: () => { menuOpen.value = false } })
</script>