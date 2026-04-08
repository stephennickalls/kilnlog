<template>
  <div class="min-h-screen bg-parchment font-serif flex items-center justify-center p-6">
    <div class="bg-white border border-parchment-3 rounded-2xl p-10 w-full max-w-md shadow-lg">

      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-block text-3xl font-bold text-ink tracking-tight mb-1">Kiln.Log</NuxtLink>
        <p class="text-sm text-ink-muted italic">Sign in to your account</p>
      </div>

      <button
        class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-parchment-3 rounded-lg bg-white text-ink text-sm font-semibold hover:bg-parchment transition-colors mb-5 disabled:opacity-50"
        :disabled="loading"
        @click="signInGoogle"
      >
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div class="flex items-center gap-4 mb-5 text-sm text-ink-muted">
        <div class="flex-1 h-px bg-parchment-3"></div>
        <span>or</span>
        <div class="flex-1 h-px bg-parchment-3"></div>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="signInEmail">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint flex justify-between items-center">
            Email
          </label>
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
            class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint flex justify-between items-center">
            Password
            <NuxtLink to="/forgot-password" class="text-flame text-xs font-medium normal-case tracking-normal hover:underline">Forgot password?</NuxtLink>
          </label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
            class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
          />
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-2 bg-flame text-parchment py-3 rounded-lg text-base font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 font-serif"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
          <span v-else>Sign in →</span>
        </button>
      </form>

      <p class="text-center mt-5 text-sm text-ink-muted">
        Don't have an account?
        <NuxtLink to="/signup" class="text-flame font-semibold hover:underline">Sign up free</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function signInGoogle() {
  loading.value = true
  error.value   = ''
  const { error: err } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options:  { redirectTo: `${window.location.origin}/confirm` },
  })
  if (err) { error.value = err.message; loading.value = false }
}

async function signInEmail() {
  loading.value = true
  error.value   = ''
  const { error: err } = await supabase.auth.signInWithPassword({
    email:    email.value,
    password: password.value,
  })
  loading.value = false
  if (err) { error.value = err.message; return }
  await navigateTo('/app')
}
</script>