<!-- File: app/components/ConeSelect.vue -->
<!--
  MOBILE (Aug 2026): the select was text-sm (14px). Any control under 16px makes
  iOS Safari zoom the page in on focus and never zoom back out. The shared
  .input handles that in one place; the utilities after it keep this control's
  roomier xl/px-4 shape and flame focus ring. Mirrors FiringTypeSelect.vue.
-->
<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
      Cone <span class="text-parchment-4 font-normal normal-case tracking-normal">(optional)</span>
    </label>
    <div class="relative">
      <select
        :value="modelValue || ''"
        class="input rounded-xl px-4 py-2.5 pr-9 appearance-none focus:border-flame focus:ring-flame/10"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option value="">—</option>
        <option v-if="!cones.length" disabled>Loading…</option>
        <option v-for="c in cones" :key="c.id" :value="c.name">Cone {{ c.name }}</option>
      </select>
      <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
// app/components/ConeSelect.vue
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])

const cones = ref([])

onMounted(async () => {
  try { cones.value = await $fetch('/api/cones') } catch {}
})
</script>