<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-icon">🔥</span>
        <h1 class="brand-name">Kiln.Log</h1>
        <p class="brand-tagline">Reset your password</p>
      </div>

      <template v-if="!sent">
        <p class="auth-description">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <form class="auth-form" @submit.prevent="submit">
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <p v-if="error" class="auth-error">{{ error }}</p>
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>Send reset link →</span>
          </button>
        </form>
      </template>

      <div v-else class="auth-success-block">
        <div class="success-icon">✉️</div>
        <p class="success-title">Check your email</p>
        <p class="success-body">We sent a password reset link to <strong>{{ email }}</strong></p>
      </div>

      <p class="auth-footer">
        <NuxtLink to="/login">← Back to sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const email    = ref('')
const error    = ref('')
const loading  = ref(false)
const sent     = ref(false)

async function submit() {
  loading.value = true
  error.value   = ''
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: 'https://kilnlog.netlify.app/reset-password',
  })
  loading.value = false
  if (err) { error.value = err.message; return }
  sent.value = true
}
</script>

<style scoped>
.auth-shell { min-height: 100vh; background: #fafaf9; display: flex; align-items: center; justify-content: center; padding: 1.5rem; font-family: 'Georgia', serif; background-image: radial-gradient(circle at 20% 80%, rgba(249,115,22,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.04) 0%, transparent 60%); }
.auth-card { background: #fff; border: 1px solid #e7e5e4; border-radius: 1.25rem; padding: 2.5rem 2rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.auth-brand { text-align: center; margin-bottom: 1.5rem; }
.brand-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
.brand-name { font-size: 1.75rem; font-weight: 700; color: #1c1917; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
.brand-tagline { font-size: 0.9rem; color: #78716c; margin: 0; font-style: italic; }
.auth-description { font-size: 0.9rem; color: #78716c; text-align: center; margin: 0 0 1.25rem; line-height: 1.5; }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; }
.field input { padding: 0.625rem 0.875rem; border: 1.5px solid #e7e5e4; border-radius: 0.625rem; font-size: 0.925rem; color: #1c1917; background: #fff; transition: border-color 0.15s; font-family: inherit; outline: none; }
.field input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
.auth-error { font-size: 0.825rem; color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.625rem 0.875rem; margin: 0; }
.btn-primary { width: 100%; padding: 0.75rem; background: #f97316; color: #fff; border: none; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: background 0.15s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.btn-primary:hover:not(:disabled) { background: #ea6c0a; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner { width: 1rem; height: 1rem; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.auth-success-block { text-align: center; padding: 1rem 0; }
.success-icon { font-size: 3rem; margin-bottom: 1rem; }
.success-title { font-size: 1.1rem; font-weight: 700; color: #1c1917; margin: 0 0 0.5rem; }
.success-body { font-size: 0.9rem; color: #78716c; margin: 0; line-height: 1.5; }
.auth-footer { text-align: center; margin: 1.5rem 0 0; font-size: 0.875rem; }
.auth-footer a { color: #f97316; text-decoration: none; font-weight: 600; }
.auth-footer a:hover { text-decoration: underline; }
</style>