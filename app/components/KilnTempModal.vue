<!-- app/components/KilnTempModal.vue -->
<!--
  G1 (°F): `temp` arrives as raw °C and is converted for the big display via
  useTempUnit. rateOfChange/elapsed are already-formatted display strings from
  useFiringStats (rate already in the active unit), so they render as-is.

  MOBILE (Aug 2026) — this screen did not fit on a phone. The number was
  `clamp(140px, 28vw, 380px)`, and at 320px 28vw is only 90px, so it pinned to
  the 140px FLOOR: a four-digit reading is then ~312px wide, plus a 50px unit,
  inside 256px of usable width. The whole point of this view is a temperature
  readable across a studio, and it was running off both edges instead.

  The floor is now 64px and the vw term does the work (24vw), so the number
  scales down to fit a 320px screen and still hits 380px on a desktop. The
  column also scrolls and clears the notch/home indicator, because at 140px+
  the number plus rate/elapsed is taller than a phone in landscape.
-->
<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center cursor-pointer font-serif overflow-y-auto"
        style="background: rgba(26,18,8,0.96)"
        @click="$emit('close')"
      >
        <div
          class="flex flex-col items-center px-4 sm:px-8 min-w-0 max-w-full"
          style="padding-top: max(2rem, env(safe-area-inset-top)); padding-bottom: max(2rem, env(safe-area-inset-bottom))"
        >

          <!-- Big temperature number -->
          <div class="flex items-end leading-none max-w-full">
            <span
              class="font-bold tabular-nums leading-none"
              :class="tempDisplay !== null ? 'text-flame' : 'text-parchment-3'"
              style="font-size: clamp(64px, 24vw, 380px)"
            >{{ tempDisplay !== null ? tempDisplay : '—' }}</span>
            <span
              class="font-bold text-flame-light mb-3"
              style="font-size: clamp(24px, 7vw, 110px)"
            >{{ unitLabel }}</span>
          </div>

          <!-- Firing name -->
          <p v-if="firingName" class="mt-4 text-parchment-3 font-medium text-center text-base sm:text-xl break-words max-w-full">
            {{ firingName }}
          </p>

          <!-- Rate + elapsed -->
          <div class="flex gap-6 sm:gap-8 mt-6 sm:mt-10 flex-wrap justify-center">
            <div v-if="isLive && rateOfChange !== '—'" class="flex flex-col items-center gap-1">
              <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-parchment-4">Rate</span>
              <span class="text-3xl sm:text-4xl font-bold text-parchment tabular-nums">{{ rateOfChange }}</span>
            </div>
            <div v-if="isLive && elapsed !== '—'" class="flex flex-col items-center gap-1">
              <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-parchment-4">Elapsed</span>
              <span class="text-3xl sm:text-4xl font-bold text-parchment tabular-nums">{{ elapsed }}</span>
            </div>
          </div>

          <!-- Tap to dismiss hint -->
          <p class="mt-8 sm:mt-12 text-parchment-4 text-xs">Tap anywhere to close</p>

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