<!-- app/components/FiringTypeSelect.vue -->
<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Type</label>
    <div class="relative">
      <select
        :value="modelValue"
        class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 pr-9 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif appearance-none"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-for="t in FIRING_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
// app/components/FiringTypeSelect.vue
// Types come from the FIRING_TYPES constant (single source of truth, shared with
// the type→colour theming) — not a DB fetch. Removes the /api/firing-types
// dependency and the silent-catch drift where the dropdown could diverge from
// the theming. Prop/emit contract unchanged, so no parent edits needed.
import { FIRING_TYPES } from '~/composables/useScheduleTheme'

defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])
</script>