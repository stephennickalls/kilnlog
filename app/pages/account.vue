<template>
  <div class="account-shell">
    <div class="account-card">
      <div class="account-header">
        <NuxtLink to="/app" class="back-link">← Back to Kiln.Log</NuxtLink>
        <h1 class="account-title">Account</h1>
      </div>

      <div v-if="loading" class="loading-block">
        <div class="spinner-lg"></div>
      </div>

      <template v-else>
        <div class="section">
          <h2 class="section-label">Profile</h2>
          <div class="info-row">
            <span class="info-key">Email</span>
            <span class="info-val">{{ user?.email }}</span>
          </div>
          <div v-if="profile?.full_name" class="info-row">
            <span class="info-key">Name</span>
            <span class="info-val">{{ profile.full_name }}</span>
          </div>
        </div>

        <div class="section">
          <h2 class="section-label">Subscription</h2>

          <template v-if="profile?.subscription_status === 'trialing'">
            <div class="status-badge status-trial">Free Trial</div>
            <p class="status-detail">
              Trial ends <strong>{{ formatDate(profile.trial_ends_at) }}</strong>
              ({{ daysLeft }} days left)
            </p>
            <button class="btn-primary" @click="checkout">Subscribe now — $27 NZD/yr</button>
          </template>

          <template v-else-if="profile?.subscription_status === 'active'">
            <div class="status-badge status-active">Active</div>
            <p class="status-detail" v-if="profile.subscription_ends_at">
              Renews <strong>{{ formatDate(profile.subscription_ends_at) }}</strong>
            </p>
            <button class="btn-ghost" @click="portal">Manage billing →</button>
          </template>

          <template v-else>
            <div class="status-badge status-expired">Inactive</div>
            <p class="status-detail">Your subscription is not active.</p>
            <button class="btn-primary" @click="checkout">Resubscribe — $27 NZD/yr</button>
          </template>
        </div>

        <div class="section">
          <button class="btn-danger" @click="signOut">Sign out</button>
        </div>
      </template>
    </div>
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

<style scoped>
.account-shell { min-height: 100vh; background: #fafaf9; display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1.5rem; font-family: 'Georgia', serif; }
.account-card { background: #fff; border: 1px solid #e7e5e4; border-radius: 1.25rem; padding: 2rem; width: 100%; max-width: 480px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.account-header { margin-bottom: 1.75rem; }
.back-link { font-size: 0.825rem; color: #f97316; text-decoration: none; font-weight: 600; }
.back-link:hover { text-decoration: underline; }
.account-title { font-size: 1.5rem; font-weight: 700; color: #1c1917; margin: 0.5rem 0 0; letter-spacing: -0.02em; }
.loading-block { display: flex; justify-content: center; padding: 2rem; }
.spinner-lg { width: 2rem; height: 2rem; border: 3px solid #fed7aa; border-top-color: #f97316; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.section { padding: 1.25rem 0; border-top: 1px solid #f5f5f4; }
.section:first-of-type { border-top: none; }
.section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #a8a29e; margin: 0 0 0.875rem; }
.info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.info-key { font-size: 0.875rem; color: #78716c; }
.info-val { font-size: 0.875rem; font-weight: 600; color: #1c1917; }
.status-badge { display: inline-block; padding: 0.375rem 0.875rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.625rem; }
.status-trial { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.status-active { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.status-expired { background: #f5f5f4; color: #78716c; border: 1px solid #e7e5e4; }
.status-detail { font-size: 0.875rem; color: #78716c; margin: 0 0 1rem; line-height: 1.5; }
.btn-primary { padding: 0.625rem 1.25rem; background: #f97316; color: #fff; border: none; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; transition: background 0.15s; font-family: inherit; }
.btn-primary:hover { background: #ea6c0a; }
.btn-ghost { padding: 0.625rem 1.25rem; background: #fff; color: #44403c; border: 1.5px solid #e7e5e4; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.btn-ghost:hover { border-color: #d6d3d1; background: #fafaf9; }
.btn-danger { padding: 0.625rem 1.25rem; background: #fff; color: #ef4444; border: 1.5px solid #fecaca; border-radius: 0.625rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.btn-danger:hover { background: #fef2f2; }
</style>