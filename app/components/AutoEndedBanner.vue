<!-- File: app/components/AutoEndedBanner.vue -->
<!--
  PACKAGE 4 — G6 surface. Shows a prominent notice when the selected firing
  was closed by the auto-ender, with a one-tap restart. Parent already owns
  restartFiring(f); this just emits.

  Usage (place directly above the chart / stats area in app.vue):

    <AutoEndedBanner
      v-if="selectedFiring?.auto_ended && selectedFiring?.ended_at"
      :firing="selectedFiring"
      @restart="restartFiring(selectedFiring)"
    />
-->
<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 rounded-xl border border-amber-300 bg-amber-50"
    role="status"
  >
    <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
    </svg>
    <p class="text-sm text-amber-800 flex-1 min-w-[200px]">
      <strong>Ended automatically</strong> — no readings were logged for a while{{ endedLabel }}.
      If the kiln is still going, restart and log a fresh reading.
    </p>
    <button
      class="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shrink-0"
      @click="$emit('restart')"
    >Restart firing</button>
  </div>
</template>

<script setup>
// app/components/AutoEndedBanner.vue
const props = defineProps({
  firing: { type: Object, required: true },
})
defineEmits(['restart'])

const endedLabel = computed(() => {
  if (!props.firing?.ended_at) return ''
  const d = new Date(props.firing.ended_at * 1000)
  return ` (closed ${d.toLocaleString('en-NZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`
})
</script>