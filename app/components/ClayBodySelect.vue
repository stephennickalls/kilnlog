<!-- app/components/ClayBodySelect.vue -->
<!--
  Clay body for a schedule. Matches FiringTypeSelect and ConeSelect: owns its
  own label, v-models a plain string, same .input styling so the three read as
  one set of controls.

  OPTIONAL BY DESIGN. The empty option is first and is a real answer, not a
  placeholder — a bisque or a raku genuinely applies to any body, and forcing a
  choice would make somebody pick one at random and file their schedule in the
  wrong group. Empty emits null rather than '' so the column stays NULL and the
  CHECK constraint is never handed an empty string.

  NOT BESIDE TYPE AND CONE. Those two are a pair: they drive the curve together
  and useAutoCurve reads both on every change. Body is independent metadata that
  only affects how the schedule is filed, so putting it in that grid would imply
  it rebuilds the curve.
-->
<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
      Clay body <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span>
    </label>
    <div class="relative">
      <select
        :value="modelValue ?? ''"
        class="input rounded-xl px-4 py-2.5 pr-9 appearance-none focus:border-flame focus:ring-flame/10"
        @change="$emit('update:modelValue', $event.target.value || null)"
      >
        <option value="">Any body</option>
        <option v-for="b in CLAY_BODIES" :key="b.value" :value="b.value">{{ b.label }}</option>
      </select>
      <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
// app/components/ClayBodySelect.vue
import { CLAY_BODIES } from '~/composables/useScheduleSections'

defineProps({
  modelValue: { type: String, default: null },
})
defineEmits(['update:modelValue'])
</script>