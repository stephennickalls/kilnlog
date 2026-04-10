<template>
  <div
    class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors"
    :class="done
      ? 'bg-green-500 text-white'
      : active
        ? 'bg-flame text-parchment'
        : 'bg-parchment-2 text-ink-faint'"
  >
    <svg v-if="done" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
    <span v-else>{{ n }}</span>
  </div>
</template>

<script setup>
defineProps({ n: Number, done: Boolean, active: Boolean })
</script>