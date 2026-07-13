<!-- app/pages/forgot-password.vue -->
<template>
  <div>
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

    <p class="text-center mt-6 text-sm text-ink-muted">
      <NuxtLink to="/login" class="text-flame font-semibold hover:underline">← Back to sign in</NuxtLink>
    </p>
  </div>
</template>

<script setup>
// app/pages/forgot-password.vue
// Chrome (background, card, brand mark, "← Back to home") lives in
// app/layouts/auth.vue. Previously this page's only exit was "Back to sign
// in" — there was no route to the marketing site at all.
definePageMeta({
  layout:   'auth',
  subtitle: 'Reset your password',
})

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