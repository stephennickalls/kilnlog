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
      <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"></div>
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
              <button class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors" @click="checkout">
                Subscribe now — $27 NZD/yr
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
              <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors" @click="portal">
                Manage billing →
              </button>
            </template>

            <template v-else>
              <div class="flex items-center justify-between">
                <span class="text-sm text-ink-muted">Status</span>
                <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3">Inactive</span>
              </div>
              <p class="text-xs text-ink-muted">Your subscription is not active.</p>
              <button class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors" @click="checkout">
                Resubscribe — $27 NZD/yr
              </button>
            </template>

          </div>
        </div>

        <!-- Sensor -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-5 py-4 border-b border-parchment-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Kiln Sensor</p>
          </div>
          <div class="px-5 py-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-ink">ESP32 Setup</p>
              <p class="text-xs text-ink-muted mt-0.5">Flash firmware and configure WiFi</p>
            </div>
            <NuxtLink to="/sensor-setup" class="px-4 py-2 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Set up →
            </NuxtLink>
          </div>
        </div>

        <!-- Sign out -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <div class="px-5 py-4">
            <button class="w-full py-2.5 border border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors" @click="signOut">
              Sign out
            </button>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()
const loading  = ref(true)
const user     = ref(null)
const profile  = ref(null)

onMounted(async () => {
  const { data: { user: u } } = await supabase.auth.getUser()
  user.value = u
  if (u) {
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    profile.value = data
  }
  loading.value = false
})

const daysLeft = computed(() => {
  if (!profile.value?.trial_ends_at) return 0
  const diff = new Date(profile.value.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function checkout() {
  const { data } = await $fetch('/api/stripe/checkout', { method: 'POST' })
  if (data?.url) window.location.href = data.url
}

async function portal() {
  const { data } = await $fetch('/api/stripe/portal', { method: 'POST' })
  if (data?.url) window.location.href = data.url
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>