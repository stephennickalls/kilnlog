<!-- app/components/DeleteAccountModal.vue -->
<!--
  G7 — irreversible account deletion. Guarded by a typed confirmation: the
  user must type DELETE exactly before the button enables. Lists what will be
  destroyed so there's no ambiguity. The actual cancel-Stripe-then-delete-auth
  work happens server-side; this component only collects intent + confirmation
  and reports progress/errors.

  Emits `confirm(text)` when the user commits; the parent calls the API and
  closes on success (or surfaces an error via the `error` prop).
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center font-serif"
      style="background:rgba(26,18,8,0.65)"
      @click.self="!busy && $emit('close')"
    >
      <div class="bg-parchment w-full sm:w-[420px] sm:max-w-[420px] sm:rounded-2xl rounded-t-2xl sm:max-h-[88vh] max-h-[92vh] overflow-y-auto p-6 flex flex-col gap-4 border border-red-200" style="box-shadow:0 -8px 40px rgba(26,18,8,0.2)">

        <div class="flex flex-col gap-1.5">
          <h2 class="text-base font-bold text-red-600">Delete account</h2>
          <p class="text-sm text-ink-muted leading-relaxed">
            This permanently deletes your account and <strong>everything in it</strong> —
            all firings and their readings, your saved schedules, and your
            settings. Any active subscription is cancelled. This cannot be undone.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs text-ink-muted">Type <strong class="text-ink">DELETE</strong> to confirm</label>
          <input
            v-model="text"
            type="text"
            placeholder="DELETE"
            :disabled="busy"
            class="w-full border border-parchment-3 rounded-lg px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-serif disabled:opacity-50"
            @keydown.enter="maybeConfirm"
          >
        </div>

        <p v-if="error" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 leading-relaxed">
          {{ error }}
        </p>

        <div class="flex justify-end gap-2">
          <button
            class="px-4 py-2 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            :disabled="busy"
            @click="$emit('close')"
          >Cancel</button>
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canConfirm || busy"
            @click="maybeConfirm"
          >
            <span v-if="busy" class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
              Deleting…
            </span>
            <span v-else>Delete forever</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open:  Boolean,
  busy:  { type: Boolean, default: false },   // parent sets while the API runs
  error: { type: String, default: '' },
})
const emit = defineEmits(['close', 'confirm'])

const text = ref('')

watch(() => props.open, (v) => { if (v) text.value = '' })

const canConfirm = computed(() => text.value === 'DELETE')

function maybeConfirm() {
  if (!canConfirm.value || props.busy) return
  emit('confirm', text.value)
}
</script>