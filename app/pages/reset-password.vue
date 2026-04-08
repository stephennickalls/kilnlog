<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-icon">🔥</span>
        <h1 class="brand-name">Kiln.Log</h1>
        <p class="brand-tagline">Choose a new password</p>
      </div>
      <template v-if="!done">
        <form class="auth-form" @submit.prevent="submit">
          <div class="field">
            <label>New password</label>
            <input v-model="password" type="password" placeholder="Min. 8 characters" required minlength="8" autocomplete="new-password" />
          </div>
          <div class="field">
            <label>Confirm password</label>
            <input v-model="confirm" type="password" placeholder="Repeat password" required autocomplete="new-password" />
          </div>
          <p v-if="error" class="auth-error">{{ error }}</p>
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>Update password →</span>
          </button>
        </form>
      </template>
      <div v-else class="auth-success-block">
        <div class="success-icon">✅</div>
        <p class="success-title">Password updated!</p>
        <p class="success-body">Redirecting you to the app…</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })
const supabase = useSupabaseClient()
const password = ref('')
const confirm  = ref('')
const error    = ref('')
const loading  = ref(false)
const done     = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== confirm.value) { error.value = 'Passwords do not match'; return }
  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false
  if (err) { error.value = err.message; return }
  done.value = true
  setTimeout(() => navigateTo('/app'), 1500)
}
</script>

<style scoped>
.auth-shell { min-height: 100vh; background: #fafaf9; display: flex; align-items: center; justify-content: center; padding: 1.5rem; font-family: 'Georgia', serif; background-image: radial-gradient(circle at 20% 80%, rgba(249,115,22,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.04) 0%, transparent 60%); }
.auth-card { background: #fff; border: 1px solid #e7e5e4; border-radius: 1.25rem; padding: 2.5rem 2rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.auth-brand { text-align: center; margin-bottom: 1.5rem; }
.brand-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
.brand-name { font-size: 1.75rem; font-weight: 700; color: #1c1917; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
.brand-tagline { font-size: 0.9rem; color: #78716c; margin: 0; font-style: italic; }
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
.success-body { font-size: 0.9rem; color: #78716c; margin: 0; }
</style>