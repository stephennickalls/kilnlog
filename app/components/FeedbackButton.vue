<!-- app/components/FeedbackButton.vue -->
<!-- Header widget: "Report a bug or request a feature" label + celadon button.
     Opens a modal (bottom sheet on mobile) with a bug/feature toggle and a
     message box. POSTs to /api/feedback. Icons are inline SVGs — no emojis. -->
<template>
  <div class="flex items-center gap-2.5 shrink-0">
    <span class="hidden lg:inline text-sm font-semibold text-ink-muted">Report a bug or request a feature</span>
    <button
      class="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border border-celadon/50 text-celadon-dark bg-celadon-bg hover:bg-celadon/20 transition-colors"
      @click="open = true"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <span class="hidden sm:inline">Feedback</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(26,18,8,0.6)" @click.self="close">
        <!-- MOBILE (Aug 2026): pads past the home indicator and caps its height
             in dvh — with the keyboard up on a short phone the Send button was
             below the fold and there was nothing to scroll. -->
        <div
          class="bg-parchment w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 flex flex-col gap-4 overflow-y-auto"
          style="max-height:90vh; max-height:min(90vh, 88dvh)"
        >

          <div class="flex items-start justify-between gap-2">
            <h2 class="text-base font-bold text-ink min-w-0">{{ sent ? 'Thank you!' : 'Report a bug or request a feature' }}</h2>
            <button class="p-2 -mr-1 -mt-1 text-ink-muted shrink-0" aria-label="Close" @click="close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <template v-if="!sent">
            <!-- Type toggle. "Request a feature" plus its icon needs ~134px and
                 each half of this row gets ~136px at 320px — right on the edge,
                 so the labels shorten below 380px rather than wrapping to two
                 lines and shunting the buttons out of alignment. -->
            <div class="flex gap-2">
              <button
                v-for="t in types" :key="t.value"
                class="flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-sm font-bold rounded-xl border transition-colors"
                :class="type === t.value
                  ? 'bg-flame text-parchment border-flame'
                  : 'bg-white text-ink-muted border-parchment-3 hover:bg-parchment-2'"
                @click="type = t.value"
              >
                <!-- Bug: alert-triangle -->
                <svg v-if="t.value === 'bug'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                <!-- Feature: lightbulb -->
                <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z"/></svg>
                <span class="min-[380px]:hidden">{{ t.shortLabel }}</span>
                <span class="hidden min-[380px]:inline truncate">{{ t.label }}</span>
              </button>
            </div>

            <textarea
              v-model="message"
              rows="4"
              maxlength="2000"
              class="input !py-2.5 resize-none"
              :placeholder="type === 'bug'
                ? 'What went wrong? What did you expect to happen?'
                : 'What would you like KilnMonitor to do?'"
            />

            <p v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{{ error }}</p>

            <button
              class="btn-primary w-full !py-3"
              :disabled="!message.trim() || sending"
              @click="submit"
            >
              {{ sending ? 'Sending…' : 'Send feedback' }}
            </button>
          </template>

          <template v-else>
            <div class="flex items-start gap-3">
              <span class="w-9 h-9 rounded-xl bg-celadon-bg border border-celadon/30 grid place-items-center text-celadon-dark shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              </span>
              <p class="text-sm text-ink-muted leading-relaxed">
                Your {{ type === 'bug' ? 'bug report' : 'feature request' }} is in — it goes straight to the developer. Thanks for helping make KilnMonitor better.
              </p>
            </div>
            <button class="btn-ghost w-full !py-3" @click="close">Close</button>
          </template>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
// app/components/FeedbackButton.vue
const route = useRoute()

const open    = ref(false)
const type    = ref('bug')
const message = ref('')
const sending = ref(false)
const sent    = ref(false)
const error   = ref('')

const types = [
  // shortLabel renders below 380px — see the type-toggle comment in the template.
  { value: 'bug',     label: 'Report a bug',      shortLabel: 'Bug' },
  { value: 'feature', label: 'Request a feature', shortLabel: 'Feature' },
]

async function submit() {
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: { type: type.value, message: message.value.trim(), page: route.fullPath },
    })
    sent.value = true
    message.value = ''
  } catch (e) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Could not send — please try again.'
  } finally {
    sending.value = false
  }
}

function close() {
  open.value = false
  // Reset after the close animation frame so the modal reopens fresh.
  setTimeout(() => { sent.value = false; error.value = '' }, 200)
}
</script>