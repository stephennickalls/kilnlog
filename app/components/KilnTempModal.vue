<!-- app/components/KilnTempModal.vue -->
<!--
  G1 (°F): `temp` arrives as raw °C and is converted for the big display via
  useTempUnit. rateOfChange/elapsed are already-formatted display strings from
  useFiringStats (rate already in the active unit), so they render as-is.
-->
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
              :class="tempDisplay !== null ? 'text-flame' : 'text-parchment-3'"
              style="font-size: clamp(140px, 28vw, 380px)"
            >{{ tempDisplay !== null ? tempDisplay : '—' }}</span>
            <span
              class="font-bold text-flame-light mb-3"
              style="font-size: clamp(50px, 8vw, 110px)"
            >{{ unitLabel }}</span>
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
const props = defineProps({
  open:         Boolean,
  temp:         { type: Number, default: null },   // raw °C
  rateOfChange: { type: String, default: '—' },
  elapsed:      { type: String, default: '—' },
  isLive:       Boolean,
  firingName:   { type: String, default: null },
})

defineEmits(['close'])

const { displayTemp, unitLabel } = useTempUnit()

const tempDisplay = computed(() => (props.temp === null ? null : displayTemp(props.temp)))
</script>