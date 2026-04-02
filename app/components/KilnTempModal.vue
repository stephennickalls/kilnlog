<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);"
      @click.self="$emit('close')"
    >
      <div
        class="bg-white rounded-3xl shadow-2xl flex flex-col items-center relative w-[90vw] h-[85vh] justify-center"
      >

        <!-- Close button -->
        <button
          class="absolute top-6 right-6 p-2.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
          @click="$emit('close')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Status badge -->
        <div class="absolute top-6 left-6">
          <span v-if="isLive" class="px-4 py-1.5 text-sm font-bold rounded-full bg-green-100 text-green-700 border border-green-200">● LIVE</span>
          <span v-else class="px-4 py-1.5 text-sm font-bold rounded-full bg-stone-100 text-stone-500 border border-stone-200">LAST READING</span>
        </div>

        <!-- Massive temp -->
        <div class="flex items-end leading-none">
          <span
            class="font-bold tabular-nums leading-none"
            :class="temp !== null ? 'text-orange-500' : 'text-stone-300'"
            style="font-size: clamp(160px, 30vw, 420px)"
          >
            {{ temp !== null ? Math.round(temp) : '—' }}
          </span>
          <span
            class="font-bold text-orange-400 mb-4"
            style="font-size: clamp(60px, 9vw, 120px)"
          >°C</span>
        </div>

        <!-- Firing name -->
        <p v-if="firingName" class="mt-4 text-stone-400 font-medium text-center text-2xl">
          {{ firingName }}
        </p>

        <!-- Supporting stats -->
        <div class="flex gap-6 mt-10 flex-wrap justify-center">
          <div v-if="peakTemp !== null" class="flex flex-col items-center gap-1">
            <span class="text-xs font-semibold uppercase tracking-widest text-stone-400">Peak</span>
            <span class="text-4xl font-bold text-stone-700 tabular-nums">{{ Math.round(peakTemp) }}°C</span>
          </div>
          <div v-if="isLive && rateOfChange !== '—'" class="flex flex-col items-center gap-1">
            <span class="text-xs font-semibold uppercase tracking-widest text-stone-400">Rate</span>
            <span class="text-4xl font-bold text-stone-700 tabular-nums">{{ rateOfChange }}</span>
          </div>
          <div v-if="isLive && elapsed !== '—'" class="flex flex-col items-center gap-1">
            <span class="text-xs font-semibold uppercase tracking-widest text-stone-400">Elapsed</span>
            <span class="text-4xl font-bold text-stone-700 tabular-nums">{{ elapsed }}</span>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open:          boolean
  temp:          number | null
  peakTemp:      number | null
  rateOfChange:  string
  elapsed:       string
  isLive:        boolean
  firingName?:   string
}>()

defineEmits<{ close: [] }>()
</script>