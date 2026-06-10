<!-- app/components/ConeSelect.vue -->
<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
      Cone <span class="text-parchment-4 font-normal normal-case tracking-normal">(optional)</span>
    </label>
    <div class="relative">
      <select
        :value="modelValue || ''"
        class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 pr-9 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif appearance-none"
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