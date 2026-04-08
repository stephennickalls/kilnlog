<template>
  <div class="subscribe-shell">
    <div class="subscribe-card">
      <div class="auth-brand">
        <span class="brand-icon">🔥</span>
        <h1 class="brand-name">Kiln.Log</h1>
      </div>

      <!-- Trial expired notice -->
      <div class="expired-notice">
        <p class="expired-title">Your free trial has ended</p>
        <p class="expired-body">Subscribe to keep monitoring your kiln firings.</p>
      </div>

      <!-- Pricing card -->
      <div class="plan-card">
        <div class="plan-header">
          <span class="plan-name">Annual Plan</span>
          <div class="plan-price">
            <span class="price-amount">$27</span>
            <span class="price-currency">NZD</span>
            <span class="price-period">/ year</span>
          </div>
          <p class="price-monthly">That's just $2.25/month</p>
        </div>

        <ul class="plan-features">
          <li>✓ Unlimited kiln firings</li>
          <li>✓ ESP32 connected mode</li>
          <li>✓ Manual logging mode</li>
          <li>✓ Schedule library</li>
          <li>✓ Full firing history</li>
          <li>✓ Mobile & desktop</li>
        </ul>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button class="btn-subscribe" :disabled="loading" @click="checkout">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Subscribe now →</span>
        </button>

        <p class="plan-footer">Secure payment via Stripe · Cancel anytime</p>
      </div>

      <p class="sign-out-link">
        Wrong account?
        <button class="link-btn" @click="signOut">Sign out</button>
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const error    = ref('')
const loading  = ref(false)

async function checkout() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await $fetch('/api/stripe/checkout', { method: 'POST' })
    if (data?.url) window.location.href = data.url
  } catch (err) {
    error.value   = err?.data?.message || 'Something went wrong. Please try again.'
    loading.value = false
  }
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<style scoped>
.subscribe-shell { min-height: 100vh; background: #fafaf9; display: flex; align-items: center; justify-content: center; padding: 1.5rem; font-family: 'Georgia', serif; background-image: radial-gradient(circle at 20% 80%, rgba(249,115,22,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.05) 0%, transparent 60%); }
.subscribe-card { background: #fff; border: 1px solid #e7e5e4; border-radius: 1.25rem; padding: 2.5rem 2rem; width: 100%; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.auth-brand { text-align: center; margin-bottom: 1.5rem; }
.brand-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
.brand-name { font-size: 1.75rem; font-weight: 700; color: #1c1917; margin: 0; letter-spacing: -0.02em; }

.expired-notice { text-align: center; margin-bottom: 1.5rem; }
.expired-title { font-size: 1rem; font-weight: 700; color: #1c1917; margin: 0 0 0.25rem; }
.expired-body { font-size: 0.875rem; color: #78716c; margin: 0; }

.plan-card { background: linear-gradient(135deg, #fff7ed, #fff); border: 2px solid #fed7aa; border-radius: 1rem; padding: 1.75rem; }
.plan-header { text-align: center; margin-bottom: 1.25rem; }
.plan-name { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #f97316; }
.plan-price { display: flex; align-items: baseline; justify-content: center; gap: 0.25rem; margin: 0.5rem 0 0.25rem; }
.price-amount { font-size: 3.5rem; font-weight: 800; color: #1c1917; line-height: 1; letter-spacing: -0.03em; }
.price-currency { font-size: 1.25rem; font-weight: 700; color: #78716c; }
.price-period { font-size: 1rem; color: #a8a29e; }
.price-monthly { font-size: 0.8rem; color: #78716c; margin: 0; }

.plan-features { list-style: none; padding: 0; margin: 0 0 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
.plan-features li { font-size: 0.875rem; color: #44403c; display: flex; align-items: center; gap: 0.5rem; }

.auth-error { font-size: 0.825rem; color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.625rem 0.875rem; margin: 0 0 1rem; }

.btn-subscribe { width: 100%; padding: 0.875rem; background: #f97316; color: #fff; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 700; cursor: pointer; transition: background 0.15s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 0.5rem; letter-spacing: -0.01em; }
.btn-subscribe:hover:not(:disabled) { background: #ea6c0a; }
.btn-subscribe:disabled { opacity: 0.5; cursor: not-allowed; }

.plan-footer { text-align: center; font-size: 0.75rem; color: #a8a29e; margin: 0.75rem 0 0; }

.spinner { width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.sign-out-link { text-align: center; margin: 1.25rem 0 0; font-size: 0.825rem; color: #a8a29e; }
.link-btn { background: none; border: none; color: #f97316; cursor: pointer; font-weight: 600; font-size: inherit; font-family: inherit; padding: 0; }
.link-btn:hover { text-decoration: underline; }
</style>