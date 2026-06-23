<!-- app/components/FiringReview.vue -->
<!--
  Shown when an ENDED firing is selected. Read-only review summary + actions.
  Desktop (sm+): full button row. Mobile: title + ellipsis menu to save space.
  `canRestart` is false when another firing is already active.
  G1 (°F): peakTemp arrives as raw °C, converted for the summary via useTempUnit.
-->
<template>
  <div class="bg-white border border-parchment-3 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex items-start sm:items-center gap-3 sm:gap-5" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">

    <!-- Summary -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-ink-faint">Finished firing</span>
        <span v-if="firing.auto_ended" class="text-[10px] px-1.5 py-0.5 rounded bg-parchment-2 text-ink-faint border border-parchment-3">auto-ended</span>
      </div>
      <p class="text-base sm:text-xl font-bold text-ink truncate mt-0.5">{{ firing.name }}</p>
      <p class="text-xs sm:text-sm text-ink-muted mt-0.5">{{ summary }}</p>
    </div>

    <!-- Actions: desktop button row -->
    <div class="hidden sm:flex gap-2 shrink-0">
      <button class="flex items-center justify-center gap-2 px-4 py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors" @click="$emit('fire-again', firing)">
        🔥 Fire this again
      </button>
      <button class="flex items-center justify-center gap-2 px-4 py-2.5 border border-celadon/30 bg-celadon-bg text-celadon-dark hover:bg-celadon hover:text-parchment text-sm font-bold rounded-xl transition-colors" @click="$emit('save-as-schedule', firing)">
        ✨ Save as schedule
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-2.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canRestart"
        :title="canRestart ? '' : 'End the active firing first'"
        @click="$emit('restart', firing)"
      >
        ↺ Restart
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-2.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!hasData"
        :title="hasData ? 'Download this firing as CSV' : 'Nothing to export yet'"
        @click="$emit('export', firing)"
      >
        ↓ Export
      </button>
    </div>

    <!-- Actions: mobile ellipsis menu -->
    <div class="sm:hidden relative shrink-0">
      <button
        class="p-2 -mr-1 rounded-lg text-ink-muted hover:bg-parchment-2 transition-colors"
        title="Actions"
        @click="menuOpen = !menuOpen"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>

      <!-- Backdrop -->
      <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />

      <!-- Menu -->
      <div
        v-if="menuOpen"
        class="absolute right-0 top-full mt-1 z-50 w-52 bg-white border border-parchment-3 rounded-xl py-1.5 flex flex-col"
        style="box-shadow:0 8px 28px rgba(58,30,8,0.16)"
      >
        <button class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-flame hover:bg-flame-bg text-left transition-colors" @click="pick('fire-again')">
          🔥 Fire this again
        </button>
        <button class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-celadon-dark hover:bg-celadon-bg text-left transition-colors" @click="pick('save-as-schedule')">
          ✨ Save as schedule
        </button>
        <div class="my-1 border-t border-parchment-3" />
        <button
          class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-parchment-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!canRestart"
          @click="pick('restart')"
        >
          ↺ Restart
        </button>
        <button
          class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-parchment-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!hasData"
          @click="pick('export')"
        >
          ↓ Export
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  firing:     { type: Object, required: true },
  canRestart: { type: Boolean, default: true },
  peakTemp:   { type: Number, default: null },   // raw °C
  duration:   { type: String, default: null },
})

const emit = defineEmits(['fire-again', 'save-as-schedule', 'restart', 'export'])

const { displayTemp, unitLabel } = useTempUnit()

const menuOpen = ref(false)

function pick(event) {
  menuOpen.value = false
  emit(event, props.firing)
}

const hasData = computed(() =>
  !!(props.firing.readings?.length || props.firing.schedule?.length)
)

const summary = computed(() => {
  const parts = []
  if (props.peakTemp !== null) parts.push(`Peak ${displayTemp(props.peakTemp)}${unitLabel.value}`)
  if (props.duration)          parts.push(props.duration)
  const n = props.firing.readings?.length
  if (n) parts.push(`${n} reading${n === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'No readings logged'
})
</script>