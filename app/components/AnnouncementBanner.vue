<!-- app/components/AnnouncementBanner.vue -->
<!--
  ANNOUNCEMENTS (Aug 2026): admin-pushed banners, delivered via /api/bootstrap.
  Stacked newest-first when several are live. Dismiss is optimistic — the
  banner hides immediately and the POST records it so it never returns on any
  device. Cobalt info styling (the app's "informational" colour).
-->
<template>
  <div v-if="visible.length" class="flex flex-col gap-2 px-3 pt-2 sm:px-5">
    <div
      v-for="a in visible"
      :key="a.id"
      class="flex items-start gap-3 rounded-xl border border-cobalt/30 bg-cobalt-bg px-4 py-3"
    >
      <span class="mt-0.5 w-2 h-2 rounded-full bg-cobalt shrink-0"/>
      <div class="flex-1 min-w-0 text-sm leading-relaxed">
        <strong v-if="a.title" class="font-bold text-cobalt-dark">{{ a.title }}</strong>
        <span v-if="a.title" class="text-cobalt-dark"> — </span>
        <span class="text-cobalt-dark">{{ a.message }}</span>
        <a
          v-if="a.link_url"
          :href="a.link_url"
          target="_blank"
          rel="noopener"
          class="ml-1.5 font-semibold text-cobalt underline underline-offset-2 hover:text-cobalt-dark whitespace-nowrap"
        >Read more →</a>
      </div>
      <button
        class="p-1 -mr-1 text-cobalt/70 hover:text-cobalt-dark transition-colors shrink-0"
        title="Dismiss"
        @click="$emit('dismiss', a.id)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  announcements: { type: Array, default: () => [] },   // pre-filtered by the server
})

defineEmits(['dismiss'])

// Server already filters to live+undismissed; sort newest first for stacking.
const visible = computed(() =>
  [...props.announcements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)
</script>