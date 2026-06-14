<!-- app/components/TempUnitToggle.vue -->
<!--
  G1 — the single reusable °C/°F switch. The unit is ONE global preference
  (useTempUnit's useState singleton, persisted server-side), so flipping it
  anywhere updates every surface instantly.

  Owns the full behaviour so callers don't re-implement it:
    - optimistic flip (UI changes immediately)
    - persist via PUT /api/preferences in the background
    - revert + toast-less fail signal if the save errors
  Emits `change(newUnit)` AFTER a successful local flip so a parent can do any
  extra repaint it needs (e.g. app.vue repaints the Chart.js canvas, which is
  imperative). Reactive SVG/HTML surfaces — schedule editor, cards — need no
  repaint; they recompute off the shared unit ref automatically, so they can
  ignore the event.

  Size variants keep it unobtrusive inline next to section labels.
-->
<template>
  <button
    class="shrink-0 inline-flex items-center rounded-lg border border-parchment-3 overflow-hidden font-bold"
    :class="sizeClass"
    title="Switch temperature unit"
    type="button"
    @click="toggle"
  >
    <span class="transition-colors" :class="[segPad, unit === 'C' ? activeClass : idleClass]">°C</span>
    <span class="transition-colors border-l border-parchment-3" :class="[segPad, unit === 'F' ? activeClass : idleClass]">°F</span>
  </button>
</template>

<script setup>
const props = defineProps({
  // 'sm' for inline-with-labels (schedule headers), 'md' for the app header.
  size: { type: String, default: 'sm' },
})
const emit = defineEmits(['change'])

const { unit, setUnit } = useTempUnit()

const sizeClass = computed(() => (props.size === 'md' ? 'text-xs' : 'text-[11px]'))
const segPad    = computed(() => (props.size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5'))
const activeClass = 'bg-flame text-parchment'
const idleClass   = 'text-ink-muted hover:bg-parchment-2'

async function toggle() {
  const prev = unit.value
  const next = prev === 'C' ? 'F' : 'C'
  setUnit(next)            // optimistic
  emit('change', next)     // let parent repaint imperative canvases
  try {
    await $fetch('/api/preferences', { method: 'PUT', body: { tempUnit: next } })
  } catch {
    setUnit(prev)          // revert
    emit('change', prev)
  }
}
</script>