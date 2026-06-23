<!-- app/components/PastDueBanner.vue -->
<!--
  G8 — persistent payment-failure warning, shown on the app page so a user
  who never opens /account still learns their card failed BEFORE the grace
  window lapses and locks them out mid-firing.

  Self-contained by design (mirrors AutoEndedBanner): does its own profile
  read and its own grace calculation, so app.vue needs only a one-line
  <PastDueBanner /> insertion — no new state, props, or wiring in the parent.

  Renders nothing unless the user is past_due AND still inside grace. Because
  it renders nothing in the common case, it owns its own spacing (mx/mt on the
  visible root) rather than relying on a wrapper in app.vue — that way there's
  zero gap above the stats bar when no banner is shown.

  Dismissible PER SESSION: the dismiss is in-memory only (a ref), so it hides
  for the current view but returns on reload / next visit — the app keeps
  working, but the user re-confronts the warning each time. Intentional: a
  failed payment is important enough to re-surface until they fix it.

  PAST_DUE_GRACE_DAYS must match server/utils/useServerUser.js and
  app/middleware/auth.js.
-->
<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="flex items-start gap-3 px-4 py-3 mx-3 mt-3 sm:mx-5 sm:mt-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
    >
      <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold">Payment failed</p>
        <p class="text-xs leading-relaxed mt-0.5">
          We couldn't charge your card. You'll keep full access until
          <span class="font-semibold">{{ graceEndsLabel }}</span> — update your
          payment method to avoid losing access mid-firing.
        </p>
      </div>
      <button
        class="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        :disabled="loading"
        @click="openPortal"
      >
        {{ loading ? 'Opening…' : 'Update card' }}
      </button>
      <button
        class="shrink-0 p-1 -mr-1 text-amber-600 hover:text-amber-800 transition-colors"
        title="Dismiss"
        @click="dismissed = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
// app/components/PastDueBanner.vue
const PAST_DUE_GRACE_DAYS = 7

const supabase  = useSupabaseClient()
const status    = ref(null)
const anchor    = ref(null)   // last_stripe_event_at
const loading   = ref(false)
const dismissed = ref(false)  // in-memory only → resets on reload / next visit

onMounted(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('subscription_status, last_stripe_event_at')
      .eq('id', user.id)
      .single()
    status.value = data?.subscription_status ?? null
    anchor.value = data?.last_stripe_event_at ?? null
  } catch {
    // Silent — a missing banner is never worth surfacing an error for.
  }
})

const graceEnds = computed(() => {
  if (status.value !== 'past_due') return null
  const base = anchor.value ? new Date(anchor.value) : new Date()
  return new Date(base.getTime() + PAST_DUE_GRACE_DAYS * 86400000)
})

const show = computed(() => !dismissed.value && !!graceEnds.value && graceEnds.value > new Date())

const graceEndsLabel = computed(() =>
  graceEnds.value
    ? graceEnds.value.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
)

async function openPortal() {
  loading.value = true
  try {
    const { data } = await $fetch('/api/stripe/portal', { method: 'POST' })
    if (data?.url) window.location.href = data.url
  } catch {
    loading.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>