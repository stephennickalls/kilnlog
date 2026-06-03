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

    <!-- Peak -->
    <div class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[120px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Peak</span>
      <span class="text-5xl font-bold tabular-nums leading-none text-ink">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}</span>
      <span class="text-base font-medium text-ink-faint mt-1">°C</span>
    </div>

    <!-- Rate — connected live only -->
    <div v-if="isLive && !isManual" class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[120px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Rate</span>
      <span class="text-4xl font-bold tabular-nums leading-none" :class="rateOfChange !== '—' ? 'text-green-600' : 'text-ink-faint'">{{ rateOfChange }}</span>
    </div>

    <!-- Target rate — live, when schedule provides one -->
    <div v-if="isLive && targetRate !== '—'" class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[120px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Target</span>
      <span class="text-4xl font-bold tabular-nums leading-none text-ink-muted">{{ targetRate }}</span>
    </div>

    <!-- Elapsed — connected live only -->
    <div v-if="isLive && !isManual" class="bg-white border border-parchment-3 rounded-xl flex flex-col items-center justify-center px-6 py-3 min-w-[120px]" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Elapsed</span>
      <span class="text-4xl font-bold tabular-nums leading-none text-ink">{{ elapsed }}</span>
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

    <!-- Notes — fills remaining space -->
    <div v-if="notes" class="bg-white border border-parchment-3 rounded-xl flex flex-col justify-center px-6 py-3 flex-1 min-w-0" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <span class="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Notes</span>
      <span class="text-sm font-medium text-ink-muted truncate">{{ notes }}</span>
    </div>

    <!-- Spacer when no notes -->
    <div v-else class="flex-1"></div>

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

      <!-- Sensors toggle — always shown when a firing is selected -->
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
defineProps({
  peakTemp:       { type: Number,  default: null },
  duration:       { type: String,  default: null },
  rateOfChange:   { type: String,  default: '—' },
  targetRate:     { type: String,  default: '—' },
  elapsed:        { type: String,  default: '—' },
  readingCount:   { type: Number,  default: 0 },
  notes:          { type: String,  default: null },
  isLive:         Boolean,
  isManual:       Boolean,
  currentTemp:    { type: Number,  default: null },
  assignedCount:  { type: Number,  default: 0 },
  showSensorPanel: { type: Boolean, default: false },
})

defineEmits(['open-temp', 'log-reading', 'sensors-toggle'])
</script>