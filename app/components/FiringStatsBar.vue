<!-- app/components/FiringStatsBar.vue -->
<template>
  <div class="flex items-stretch gap-3 flex-wrap">

    <!-- Current temp — big, clickable -->
    <button
      class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 hover:border-flame/40 hover:bg-flame-bg transition-colors min-w-[130px]"
      style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      @click="$emit('open-temp')"
    >
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Current</span>
      <span class="text-5xl font-bold tabular-nums leading-none" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-4'">
        {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
      </span>
      <span class="text-base font-medium text-flame-light mt-1">°C</span>
    </button>

    <!-- Target temp — interpolated from schedule -->
    <div v-if="isLive && targetTemp !== null" class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[130px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Target</span>
      <span class="text-5xl font-bold tabular-nums leading-none text-ink-muted">{{ targetTemp }}</span>
      <span class="text-base font-medium text-ink-faint mt-1">°C</span>
    </div>

    <!-- Rate — actual and target stacked equally, both labelled.
         Shown in connected AND manual mode (matters most when hand-adjusting). -->
    <div v-if="isLive" class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[140px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1.5">Rate</span>
      <div class="flex flex-col items-center gap-1">
        <div class="flex items-baseline gap-1.5">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">act</span>
          <span class="text-2xl font-bold tabular-nums leading-none" :class="rateColorClass">{{ rateOfChange }}</span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">tgt</span>
          <span class="text-2xl font-bold tabular-nums leading-none text-ink-muted">{{ targetRate }}</span>
        </div>
      </div>
    </div>

    <!-- Duration — past firings -->
    <div v-if="duration" class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[120px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Duration</span>
      <span class="text-4xl font-bold tabular-nums leading-none text-ink">{{ duration }}</span>
    </div>

    <!-- Readings -->
    <div class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[100px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Readings</span>
      <span class="text-5xl font-bold tabular-nums leading-none text-ink">{{ readingCount }}</span>
    </div>

    <div class="flex-1"/>

    <!-- Action buttons -->
    <div class="flex items-center gap-2 shrink-0">

      <!-- Log reading — manual live only -->
      <button
        v-if="isManual && isLive"
        class="bg-flame hover:bg-flame-dark text-parchment rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[130px] transition-colors"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        @click="$emit('log-reading')"
      >
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span class="text-xs font-semibold uppercase tracking-widest">Log Reading</span>
      </button>

      <!-- Sensors toggle -->
      <button
        class="bg-white border rounded-xl flex flex-col items-center justify-center px-5 py-3 transition-colors relative"
        :class="showSensorPanel
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-parchment-3 text-ink-muted hover:bg-parchment'"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        @click="$emit('sensors-toggle')"
      >
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
        </svg>
        <span class="text-xs font-semibold uppercase tracking-widest">Sensors</span>
        <span
          v-if="assignedCount"
          class="absolute -top-1.5 -right-1.5 text-[9px] bg-flame text-parchment rounded-full w-4 h-4 flex items-center justify-center font-bold"
        >{{ assignedCount }}</span>
      </button>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  targetTemp:      { type: Number,  default: null },
  duration:        { type: String,  default: null },
  rateOfChange:    { type: String,  default: '—' },
  targetRate:      { type: String,  default: '—' },
  readingCount:    { type: Number,  default: 0 },
  isLive:          Boolean,
  isManual:        Boolean,
  currentTemp:     { type: Number,  default: null },
  assignedCount:   { type: Number,  default: 0 },
  showSensorPanel: { type: Boolean, default: false },
})

defineEmits(['open-temp', 'log-reading', 'sensors-toggle'])

// Colour the actual rate by how it compares to target:
//   within 1.5°/m  → green (on track)
//   >1.5 over      → amber (too fast — ease off)
//   >1.5 under     → blue  (too slow — push harder)
function parseRate(str) {
  if (!str || str === '—') return null
  const n = parseFloat(str.replace('°/m', ''))
  return isFinite(n) ? n : null
}

const rateColorClass = computed(() => {
  const actual = parseRate(props.rateOfChange)
  const target = parseRate(props.targetRate)
  if (actual === null) return 'text-ink-faint'
  if (target === null) return 'text-green-600'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-600'
  if (diff < -1.5) return 'text-blue-600'
  return 'text-green-600'
})
</script>