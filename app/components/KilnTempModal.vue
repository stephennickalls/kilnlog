<!-- app/components/KilnTempModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center cursor-pointer font-serif"
        style="background: rgba(26,18,8,0.96)"
        @click="$emit('close')"
      >
        <div class="flex flex-col items-center px-8">

          <!-- Big temperature number -->
          <div class="flex items-end leading-none">
            <span
              class="font-bold tabular-nums leading-none"
              :class="temp !== null ? 'text-flame' : 'text-parchment-3'"
              style="font-size: clamp(140px, 28vw, 380px)"
            >{{ temp !== null ? Math.round(temp) : '—' }}</span>
            <span
              class="font-bold text-flame-light mb-3"
              style="font-size: clamp(50px, 8vw, 110px)"
            >°C</span>
          </div>

          <!-- Firing name -->
          <p v-if="firingName" class="mt-4 text-parchment-3 font-medium text-center text-xl">
            {{ firingName }}
          </p>

          <!-- Rate + elapsed -->
          <div class="flex gap-8 mt-10 flex-wrap justify-center">
            <div v-if="isLive && rateOfChange !== '—'" class="flex flex-col items-center gap-1">
              <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-parchment-4">Rate</span>
              <span class="text-4xl font-bold text-parchment tabular-nums">{{ rateOfChange }}</span>
            </div>
            <div v-if="isLive && elapsed !== '—'" class="flex flex-col items-center gap-1">
              <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-parchment-4">Elapsed</span>
              <span class="text-4xl font-bold text-parchment tabular-nums">{{ elapsed }}</span>
            </div>
          </div>

          <!-- Tap to dismiss hint -->
          <p class="mt-12 text-parchment-4 text-xs">Tap anywhere to close</p>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// app/components/KilnTempModal.vue
defineProps({
  open:         Boolean,
  temp:         { type: Number, default: null },
  rateOfChange: { type: String, default: '—' },
  elapsed:      { type: String, default: '—' },
  isLive:       Boolean,
  firingName:   { type: String, default: null },
})

defineEmits(['close'])
</script>