<!-- app/components/AutoEndedNotice.vue -->
<!-- Drop inside the firing detail view or sidebar card.          -->
<!-- Props: firing (object), onDismiss (function)                 -->
<template>
  <div
    v-if="show"
    class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
  >
    <span class="mt-0.5 shrink-0">⚠️</span>
    <span class="flex-1">{{ message }}</span>
    <button
      class="ml-1 shrink-0 text-amber-500 hover:text-amber-700"
      @click="dismiss"
    >✕</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAutoEndNotices } from '~/composables/useAutoEndNotices'

const props = defineProps({
  firing: { type: Object, required: true },
  onDismiss: { type: Function, default: null },
})

const { isDismissed, dismiss: dismissId } = useAutoEndNotices()

const show = computed(() =>
  props.firing?.auto_ended && props.firing?.ended_at && !isDismissed(props.firing.id)
)

const message = computed(() =>
  'This firing was automatically ended after 2 hours with no new readings. You can restart it if needed.'
)

function dismiss() {
  dismissId(props.firing.id)
  props.onDismiss?.()
}
</script>