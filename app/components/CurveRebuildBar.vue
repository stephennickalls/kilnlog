<!-- File: app/components/CurveRebuildBar.vue -->
<!--
  Shown when the type or cone changed but the curve on screen is the user's own
  work, so it was NOT regenerated. The rebuild is offered rather than applied,
  because the alternative is destroying somebody's saved schedule to be helpful.

  Deliberately not a modal: it sits above the curve, the page stays usable, and
  ignoring it is a valid answer. Used by /schedules/new and /schedules/[id].
-->
<template>
  <div
    v-if="visible"
    class="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-flame/25 bg-flame-bg"
  >
    <svg class="w-4 h-4 text-flame shrink-0 mt-px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 11-3.5-7.1M21 3v6h-6"/>
    </svg>

    <p class="flex-1 min-w-0 text-[11px] text-ink-muted leading-snug">
      Replace this curve with a standard <span class="font-bold text-ink">{{ label }}</span> curve?
      Your current points will be lost.
    </p>

    <button
      class="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-flame border border-flame/30 hover:bg-flame hover:text-parchment transition-colors"
      @click="$emit('apply')"
    >Rebuild</button>

    <button
      class="shrink-0 p-1 -mr-1 rounded-lg text-ink-faint hover:text-ink transition-colors"
      aria-label="Keep my curve"
      @click="$emit('dismiss')"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
</template>

<script setup>
// app/components/CurveRebuildBar.vue
defineProps({
  visible: { type: Boolean, default: false },
  label:   { type: String,  default: '' },   // e.g. "Glaze · cone 6"
})
defineEmits(['apply', 'dismiss'])
</script>