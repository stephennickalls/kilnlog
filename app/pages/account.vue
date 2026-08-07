<!-- File: app/pages/account.vue -->
<!--
  MOBILE (Aug 2026): this page was unreachable-from and unescapable-on a phone.
  Its only navigation was "Back to app" behind `hidden sm:inline-flex`, and it
  never rendered a UserMenu — so on an iPhone there was no way out except the
  browser's back button. It now uses the shared AppNav, which carries the
  account menu (and therefore the whole app's navigation) at every width.

  The other mobile bug was the Profile card: `justify-between` with a long
  unbroken email set the row's min-content wider than a 375px screen and pushed
  the document sideways. Rows now stack under sm and the email breaks.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <AppNav :crumbs="[{ label: 'Account' }]" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="flex flex-col items-center justify-center py-20 gap-3 px-4 text-center">
      <p class="text-sm text-ink-muted">{{ loadError }}</p>
      <button class="text-sm text-flame font-semibold" @click="load">Try again</button>
    </div>

    <template v-else>
      <div class="max-w-lg mx-auto px-4 py-6 pb-safe flex flex-col gap-4">

        <!-- Profile -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-4 sm:px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Profile</p>
          </div>
          <div class="px-4 sm:px-5 py-4 flex flex-col gap-3">
            <!-- Label above value on phones: an email is longer than half a
                 375px row, and side-by-side forced horizontal overflow. -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3">
              <span class="text-sm text-ink-muted shrink-0">Email</span>
              <span class="text-sm font-semibold text-ink break-all sm:text-right min-w-0">{{ user?.email }}</span>
            </div>
            <div v-if="profile?.full_name" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3">
              <span class="text-sm text-ink-muted shrink-0">Name</span>
              <span class="text-sm font-semibold text-ink break-words sm:text-right min-w-0">{{ profile.full_name }}</span>
            </div>
          </div>
        </div>

        <!-- Membership -->
        <!--
          BETA-TEMP: pricing hidden during beta. The original Subscription card
          (trial countdown, subscribe/portal buttons, past_due grace UI) is
          preserved in git history — restore it when billing goes live.
          Grep "BETA-TEMP" to find all beta patches.
        -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-4 sm:px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Membership</p>
          </div>
          <div class="px-4 sm:px-5 py-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-ink-muted">Status</span>
              <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-flame-bg text-flame border border-flame/30 shrink-0">Beta tester</span>
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              You're on free access as a KilnMonitor beta tester — thank you for
              helping shape the app. We'll be in touch well before any pricing
              kicks in.
            </p>
            <p class="text-xs text-ink-muted leading-relaxed">
              Found a bug, or have an idea? Email
              <a href="mailto:kilnmonitor@gmail.com?subject=KilnMonitor%20beta%20feedback" class="text-flame font-semibold hover:underline break-all">kilnmonitor@gmail.com</a>
              — every message gets read.
            </p>
          </div>
        </div>

        <!-- G7: Your data (export) -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-4 sm:px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Your data</p>
          </div>
          <div class="px-4 sm:px-5 py-4 flex flex-col gap-3">
            <p class="text-xs text-ink-muted leading-relaxed">
              Download everything in your account — all firings and readings, your
              schedules, and settings — as a single JSON file.
            </p>
            <button
              class="w-full min-h-[44px] py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors disabled:opacity-50"
              :disabled="exporting"
              @click="onExport"
            >
              <span v-if="exporting" class="flex items-center justify-center gap-2">
                <span class="w-3.5 h-3.5 border-2 border-parchment-3 border-t-ink-muted rounded-full animate-spin"/>
                Preparing…
              </span>
              <span v-else>↓ Export my data</span>
            </button>
            <p v-if="exportError" class="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ exportError }}</p>
          </div>
        </div>

        <!-- Sign out -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-4 sm:px-5 py-4">
            <button class="w-full min-h-[44px] py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors" @click="signOut">
              Sign out
            </button>
          </div>
        </div>

        <!-- G7: Danger zone (delete account) -->
        <div class="bg-white border border-red-200 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-4 sm:px-5 py-4 border-b border-red-100">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-red-400">Danger zone</p>
          </div>
          <div class="px-4 sm:px-5 py-4 flex flex-col gap-3">
            <p class="text-xs text-ink-muted leading-relaxed">
              Permanently delete your account and all your data. Any active
              subscription is cancelled. This cannot be undone.
            </p>
            <button
              class="w-full min-h-[44px] py-2.5 border border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
              @click="showDeleteModal = true"
            >
              Delete account
            </button>
          </div>
        </div>

      </div>
    </template>

    <!-- G7: delete confirmation modal -->
    <DeleteAccountModal
      :open="showDeleteModal"
      :busy="deleting"
      :error="deleteError"
      @close="!deleting && (showDeleteModal = false)"
      @confirm="onDeleteConfirmed"
    />
  </div>
</template>

<script setup>
// app/pages/account.vue
definePageMeta({ middleware: 'auth' })

// G8 — keep in sync with PAST_DUE_GRACE_DAYS in server/utils/useServerUser.js
// and app/middleware/auth.js. (BETA-TEMP: unused while pricing is hidden.)
const PAST_DUE_GRACE_DAYS = 7

const supabase     = useSupabaseClient()
const { exportAllData, deleteAccount } = useAccountData()   // G7

const loading      = ref(true)
const loadError    = ref('')
// BETA-TEMP: billing state unused while pricing is hidden; kept for revert.
const billingLoading = ref(false)
const billingError = ref('')
const user         = ref(null)
const profile      = ref(null)

// G7 state
const exporting       = ref(false)
const exportError     = ref('')
const showDeleteModal = ref(false)
const deleting        = ref(false)
const deleteError     = ref('')

async function load() {
  loading.value   = true
  loadError.value = ''
  try {
    const { data: { user: u } } = await supabase.auth.getUser()
    user.value = u
    if (u) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      if (error) throw error
      profile.value = data
    }
  } catch (e) {
    loadError.value = 'Could not load your account. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// BETA-TEMP: the computeds and billing functions below are unreferenced while
// the beta Membership card replaces the Subscription card. Kept intact for the
// pricing revert — do not delete.

const daysLeft = computed(() => {
  if (!profile.value?.trial_ends_at) return 0
  const diff = new Date(profile.value.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const graceEnds = computed(() => {
  if (profile.value?.subscription_status !== 'past_due') return null
  const anchor = profile.value.last_stripe_event_at
    ? new Date(profile.value.last_stripe_event_at)
    : new Date()
  return new Date(anchor.getTime() + PAST_DUE_GRACE_DAYS * 86400000)
})

const inGrace = computed(() => !!graceEnds.value && graceEnds.value > new Date())
const graceEndsLabel = computed(() => (graceEnds.value ? formatDate(graceEnds.value) : ''))

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function checkout() {
  billingLoading.value = true
  billingError.value   = ''
  try {
    const { data } = await $fetch('/api/stripe/checkout', { method: 'POST' })
    if (data?.url) window.location.href = data.url
  } catch (e) {
    billingError.value = e?.data?.message ?? 'Could not start checkout. Please try again.'
  } finally {
    billingLoading.value = false
  }
}

async function portal() {
  billingLoading.value = true
  billingError.value   = ''
  try {
    const { data } = await $fetch('/api/stripe/portal', { method: 'POST' })
    if (data?.url) window.location.href = data.url
  } catch (e) {
    billingError.value = e?.data?.message ?? 'Could not open billing portal. Please try again.'
  } finally {
    billingLoading.value = false
  }
}

// G7: export
async function onExport() {
  exporting.value = true
  exportError.value = ''
  try {
    await exportAllData()
  } catch (e) {
    exportError.value = e?.data?.message ?? 'Could not export your data. Please try again.'
  } finally {
    exporting.value = false
  }
}

// G7: delete
async function onDeleteConfirmed(text) {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteAccount(text)
    await supabase.auth.signOut()
    await navigateTo('/login')
  } catch (e) {
    deleteError.value = e?.data?.message ?? e?.data?.statusMessage ?? 'Could not delete your account. Please try again.'
    deleting.value = false
  }
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>