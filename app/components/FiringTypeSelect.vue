<!-- File: app/components/FiringTypeSelect.vue -->
<!--
  MOBILE (Aug 2026): the select was text-sm (14px). Any control under 16px makes
  iOS Safari zoom the page in on focus and never zoom back out. The shared
  .input is text-base on phones and text-sm from sm up; the utilities after it
  keep this control's roomier xl/px-4 shape and flame focus ring.
  ConeSelect.vue carries the identical markup — apply the same swap there.
-->
<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Type</label>
    <div class="relative">
      <select
        :value="modelValue"
        class="input rounded-xl px-4 py-2.5 pr-9 appearance-none focus:border-flame focus:ring-flame/10"
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