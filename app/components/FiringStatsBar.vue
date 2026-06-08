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

    <!-- Rate — actual and target stacked equally, both labelled. -->
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

      <!-- Log reading — live only -->
      <button
        v-if="isLive"
        class="bg-flame hover:bg-flame-dark text-parchment rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[130px] transition-colors"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        @click="$emit('log-reading')"
      >
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span class="text-xs font-semibold uppercase tracking-widest">Log Reading</span>
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
  currentTemp:     { type: Number,  default: null },
})

defineEmits(['open-temp', 'log-reading'])

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