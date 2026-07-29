<!-- app/pages/login.vue -->
<template>
  <div>
 

    <div class="flex items-center gap-4 mb-5 text-sm text-ink-muted">
      <div class="flex-1 h-px bg-parchment-3"/>
      <span>or</span>
      <div class="flex-1 h-px bg-parchment-3"/>
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
        >
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
        >
      </div>

      <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
        {{ error }}
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-2 bg-flame text-parchment py-3 rounded-lg text-base font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 font-serif"
      >
        <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
        <span v-else>Sign in →</span>
      </button>
    </form>

    <!--
      BETA-TEMP: was —
        <p class="text-center mt-5 text-sm text-ink-muted">
          Don't have an account?
          <NuxtLink to="/signup" class="text-flame font-semibold hover:underline">Sign up free</NuxtLink>
        </p>
      Public signup is closed during beta, so this points at the interest form
      instead. Restore the block above when going live.
    -->
    <p class="text-center mt-5 text-sm text-ink-muted">
      Not a beta tester yet?
      <NuxtLink to="/register-interest" class="text-flame font-semibold hover:underline">Request access</NuxtLink>
    </p>
  </div>
</template>

<script setup>
// app/pages/login.vue
// Chrome (background, card, brand mark, "← Back to home") lives in
// app/layouts/auth.vue. This file is just the sign-in form.
definePageMeta({
  layout:   'auth',
  subtitle: 'Sign in to your account',
})

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