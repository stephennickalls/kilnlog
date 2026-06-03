<!-- app/pages/forgot-password.vue -->
<template>
  <div
class="min-h-screen bg-parchment font-serif flex items-center justify-center px-6"
    style="background-image: radial-gradient(circle at 20% 80%, rgba(176,92,26,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(176,92,26,0.04) 0%, transparent 60%)"
  >
    <div class="w-full max-w-sm bg-white border border-parchment-3 rounded-2xl p-10" style="box-shadow: 0 4px 24px rgba(0,0,0,0.06)">

      <!-- Brand -->
      <div class="text-center mb-6">
        <span class="text-5xl block mb-2">🔥</span>
        <h1 class="text-2xl font-bold text-ink tracking-tight">KilnMonitor</h1>
        <p class="text-sm text-ink-muted italic mt-0.5">Reset your password</p>
      </div>

      <!-- Form -->
      <template v-if="!sent">
        <p class="text-sm text-ink-muted text-center mb-5 leading-relaxed">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif transition-colors"
            >
          </div>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 bg-flame text-parchment py-3 rounded-xl text-sm font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            <span v-else>Send reset link →</span>
          </button>
        </form>
      </template>

      <!-- Success state -->
      <div v-else class="text-center py-4 flex flex-col items-center gap-3">
        <span class="text-5xl">✉️</span>
        <p class="text-base font-bold text-ink">Check your email</p>
        <p class="text-sm text-ink-muted leading-relaxed">
          We sent a reset link to <strong class="text-ink">{{ email }}</strong>
        </p>
      </div>

      <!-- Footer -->
      <p class="text-center mt-6 text-sm text-ink-muted">
        <NuxtLink to="/login" class="text-flame font-semibold hover:underline">← Back to sign in</NuxtLink>
      </p>

    </div>
  </div>
</template>

<script setup>
// app/pages/forgot-password.vue
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
    redirectTo: `${window.location.origin}/reset-password`,
  })
  loading.value = false
  if (err) { error.value = err.message; return }
  sent.value = true
}
</script>