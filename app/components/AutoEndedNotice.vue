<!-- File: app/components/AutoEndedNotice.vue -->
<!--
  Drop inside the firing detail view or sidebar card.
  Props: firing (object), onDismiss (function)

  THRESHOLD (Aug 2026): the message used to hardcode "2 hours" and went stale
  through two threshold changes (2h -> 12h) without anyone noticing. It now
  reads the firing's OWN auto_end_hours, which the server set from the fuel at
  creation (gas 36h, wood 96h; NULL on pre-migration rows falls back to the
  same default autoEndStale uses). Do not hardcode a number here again.
  auto_end_hours is in FIRING_LIST_COLUMNS, so sidebar list rows carry it too.
-->
<template>
  <div
    v-if="show"
    class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
  >
    <span class="mt-0.5 shrink-0">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
      </svg>
    </span>
    <span class="flex-1">{{ message }}</span>
    <button
      class="ml-1 shrink-0 text-amber-500 hover:text-amber-700"
      aria-label="Dismiss"
      @click="dismiss"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
</template>

<script setup>
// app/components/AutoEndedNotice.vue
import { computed } from 'vue'
import { useAutoEndNotices } from '~/composables/useAutoEndNotices'

// Mirrors AUTO_END_DEFAULT_HOURS in server/utils/autoEndStale.js. Only ever
// used for rows created before auto_end_hours existed.
const DEFAULT_HOURS = 24

const props = defineProps({
  firing: { type: Object, required: true },
  onDismiss: { type: Function, default: null },
})

const { isDismissed, dismiss: dismissId } = useAutoEndNotices()

const show = computed(() =>
  props.firing?.auto_ended && props.firing?.ended_at && !isDismissed(props.firing.id)
)

const hours = computed(() => {
  const h = Number(props.firing?.auto_end_hours)
  return Number.isFinite(h) && h > 0 ? h : DEFAULT_HOURS
})

const message = computed(() =>
  `This firing was automatically ended after ${hours.value} hours with no new readings. You can restart it if needed.`
)

function dismiss() {
  dismissId(props.firing.id)
  props.onDismiss?.()
}
</script>