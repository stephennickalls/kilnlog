<!-- app/pages/account.vue -->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-parchment border-b border-parchment-3 px-4 py-3 flex items-center gap-3">
      <NuxtLink to="/app" class="p-1.5 rounded-lg text-ink-muted hover:bg-parchment-2 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </NuxtLink>
      <h1 class="text-base font-bold text-ink tracking-tight">Account</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="flex flex-col items-center justify-center py-20 gap-3">
      <p class="text-sm text-ink-muted">{{ loadError }}</p>
      <button class="text-sm text-flame font-semibold" @click="load">Try again</button>
    </div>

    <template v-else>
      <div class="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        <!-- Profile -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Profile</p>
          </div>
          <div class="px-5 py-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-ink-muted">Email</span>
              <span class="text-sm font-semibold text-ink">{{ user?.email }}</span>
            </div>
            <div v-if="profile?.full_name" class="flex items-center justify-between">
              <span class="text-sm text-ink-muted">Name</span>
              <span class="text-sm font-semibold text-ink">{{ profile.full_name }}</span>
            </div>
          </div>
        </div>

        <!-- Subscription -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Subscription</p>
          </div>
          <div class="px-5 py-4 flex flex-col gap-4">

            <template v-if="profile?.subscription_status === 'trialing'">
              <div class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Status</span>
                <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Free Trial</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Trial ends</span>
                <span class="text-sm font-semibold text-ink">{{ formatDate(profile.trial_ends_at) }}</span>
              </div>
              <p class="text-xs text-ink-faint">{{ daysLeft }} day{{ daysLeft !== 1 ? 's' : '' }} remaining</p>
              <button
                class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-50"
                :disabled="billingLoading"
                @click="checkout"
              >
                <span v-if="billingLoading" class="flex items-center justify-center gap-2">
                  <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Redirecting…
                </span>
                <span v-else>Subscribe now — $49 NZD/yr</span>
              </button>
            </template>

            <template v-else-if="profile?.subscription_status === 'active'">
              <div class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Status</span>
                <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
              </div>
              <div v-if="profile.subscription_ends_at" class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Renews</span>
                <span class="text-sm font-semibold text-ink">{{ formatDate(profile.subscription_ends_at) }}</span>
              </div>
              <button
                class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors disabled:opacity-50"
                :disabled="billingLoading"
                @click="portal"
              >
                <span v-if="billingLoading" class="flex items-center justify-center gap-2">
                  <span class="w-3.5 h-3.5 border-2 border-parchment-3 border-t-ink-muted rounded-full animate-spin"/>
                  Redirecting…
                </span>
                <span v-else>Manage billing →</span>
              </button>
            </template>

            <!-- G8: failed payment, still inside the grace window. -->
            <template v-else-if="profile?.subscription_status === 'past_due' && inGrace">
              <div class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Status</span>
                <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Payment failed</span>
              </div>
              <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                We couldn't charge your card. Your access stays on until
                <span class="font-semibold">{{ graceEndsLabel }}</span> — update your
                payment method to keep it active.
              </p>
              <button
                class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-50"
                :disabled="billingLoading"
                @click="portal"
              >
                <span v-if="billingLoading" class="flex items-center justify-center gap-2">
                  <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Redirecting…
                </span>
                <span v-else>Update payment method →</span>
              </button>
            </template>

            <template v-else>
              <div class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Status</span>
                <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3">Inactive</span>
              </div>
              <p class="text-xs text-ink-muted">Your subscription is not active.</p>
              <button
                class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-50"
                :disabled="billingLoading"
                @click="checkout"
              >
                <span v-if="billingLoading" class="flex items-center justify-center gap-2">
                  <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Redirecting…
                </span>
                <span v-else>Resubscribe — $49 NZD/yr</span>
              </button>
            </template>

            <!-- Billing error -->
            <p v-if="billingError" class="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {{ billingError }}
            </p>

          </div>
        </div>

        <!-- G7: Your data (export) -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Your data</p>
          </div>
          <div class="px-5 py-4 flex flex-col gap-3">
            <p class="text-xs text-ink-muted leading-relaxed">
              Download everything in your account — all firings and readings, your
              schedules, and settings — as a single JSON file.
            </p>
            <button
              class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors disabled:opacity-50"
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
          <div class="px-5 py-4">
            <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors" @click="signOut">
              Sign out
            </button>
          </div>
        </div>

        <!-- G7: Danger zone (delete account) -->
        <div class="bg-white border border-red-200 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-5 py-4 border-b border-red-100">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-red-400">Danger zone</p>
          </div>
          <div class="px-5 py-4 flex flex-col gap-3">
            <p class="text-xs text-ink-muted leading-relaxed">
              Permanently delete your account and all your data. Any active
              subscription is cancelled. This cannot be undone.
            </p>
            <button
              class="w-full py-2.5 border border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
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
// and app/middleware/auth.js.
const PAST_DUE_GRACE_DAYS = 7

const supabase     = useSupabaseClient()
const { exportAllData, deleteAccount } = useAccountData()   // G7

const loading      = ref(true)
const loadError    = ref('')
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