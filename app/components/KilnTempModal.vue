<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 flex items-center justify-center z-50 font-serif"
      style="background: rgba(26,18,8,0.75); backdrop-filter: blur(8px);"
      @click.self="$emit('close')"
    >
      <div class="bg-parchment rounded-3xl flex flex-col items-center relative w-[90vw] h-[85vh] justify-center border border-parchment-3"
        style="box-shadow: 0 24px 80px rgba(26,18,8,0.4)">

        <!-- Close -->
        <button
          class="absolute top-6 right-6 p-2.5 rounded-full hover:bg-parchment-2 transition-colors text-ink-muted hover:text-ink"
          @click="$emit('close')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Status badge -->
        <div class="absolute top-6 left-6">
          <span v-if="isLive" class="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-full bg-green-50 text-green-700 border border-green-200">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Live
          </span>
          <span v-else class="px-4 py-1.5 text-sm font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3">Last reading</span>
        </div>

        <!-- Massive temp -->
        <div class="flex items-end leading-none">
          <span
            class="font-bold tabular-nums leading-none"
            :class="temp !== null ? 'text-flame' : 'text-parchment-3'"
            style="font-size: clamp(140px, 28vw, 380px)"
          >{{ temp !== null ? Math.round(temp) : '—' }}</span>
          <span class="font-bold text-flame-light mb-3" style="font-size: clamp(50px, 8vw, 110px)">°C</span>
        </div>

        <!-- Firing name -->
        <p v-if="firingName" class="mt-4 text-ink-muted font-medium text-center text-xl">{{ firingName }}</p>

        <!-- Supporting stats -->
        <div class="flex gap-8 mt-10 flex-wrap justify-center">
          <div v-if="peakTemp !== null" class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Peak</span>
            <span class="text-4xl font-bold text-ink tabular-nums">{{ Math.round(peakTemp) }}°C</span>
          </div>
          <div v-if="isLive && rateOfChange !== '—'" class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Rate</span>
            <span class="text-4xl font-bold text-ink tabular-nums">{{ rateOfChange }}</span>
          </div>
          <div v-if="isLive && elapsed !== '—'" class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Elapsed</span>
            <span class="text-4xl font-bold text-ink tabular-nums">{{ elapsed }}</span>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  open:         Boolean,
  temp:         { type: Number, default: null },
  peakTemp:     { type: Number, default: null },
  rateOfChange: { type: String, default: '—' },
  elapsed:      { type: String, default: '—' },
  isLive:       Boolean,
  firingName:   { type: String, default: null },
})

defineEmits(['close'])
</script>