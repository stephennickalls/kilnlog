<template>
  <div class="flex items-stretch gap-3">

    <!-- Current temp — big, clickable -->
    <button
      class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 hover:border-orange-300 hover:bg-orange-50 transition-colors min-w-[130px]"
      @click="$emit('openTemp')"
    >
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Current</span>
      <span class="text-5xl font-bold tabular-nums leading-none" :class="currentTemp !== null ? 'text-orange-500' : 'text-stone-300'">
        {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
      </span>
      <span class="text-base font-medium text-orange-400 mt-1">°C</span>
    </button>

    <!-- Peak -->
    <div class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 min-w-[120px]">
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Peak</span>
      <span class="text-5xl font-bold tabular-nums leading-none text-stone-700">
        {{ peakTemp !== null ? Math.round(peakTemp) : '—' }}
      </span>
      <span class="text-base font-medium text-stone-400 mt-1">°C</span>
    </div>

    <!-- Rate — connected live only -->
    <div v-if="isLive && !isManual" class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 min-w-[120px]">
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Rate</span>
      <span class="text-4xl font-bold tabular-nums leading-none text-stone-700">{{ rateOfChange }}</span>
    </div>

    <!-- Elapsed — connected live only -->
    <div v-if="isLive && !isManual" class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 min-w-[120px]">
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Elapsed</span>
      <span class="text-4xl font-bold tabular-nums leading-none text-stone-700">{{ elapsed }}</span>
    </div>

    <!-- Duration — past firings -->
    <div v-if="duration" class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 min-w-[120px]">
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Duration</span>
      <span class="text-4xl font-bold tabular-nums leading-none text-stone-700">{{ duration }}</span>
    </div>

    <!-- Readings -->
    <div class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 min-w-[100px]">
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Readings</span>
      <span class="text-5xl font-bold tabular-nums leading-none text-stone-700">{{ readingCount }}</span>
    </div>

    <!-- Notes — fills remaining space -->
    <div v-if="notes" class="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col justify-center px-6 py-3 flex-1 min-w-0">
      <span class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Notes</span>
      <span class="text-sm font-medium text-stone-700 truncate">{{ notes }}</span>
    </div>

    <!-- Log reading button — manual mode, active firing only -->
    <button
      v-if="isManual && isLive"
      class="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm flex flex-col items-center justify-center px-6 py-3 min-w-[130px] transition-colors"
      @click="$emit('logReading')"
    >
      <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span class="text-xs font-semibold uppercase tracking-widest">Log Reading</span>
    </button>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  peakTemp:     number | null
  duration:     string | null
  rateOfChange: string
  elapsed:      string
  readingCount: number
  notes?:       string
  isLive:       boolean
  isManual:     boolean
  currentTemp:  number | null
}>()

defineEmits<{
  openTemp:   []
  logReading: []
}>()
</script>