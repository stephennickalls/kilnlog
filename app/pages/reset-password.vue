<!-- app/pages/reset-password.vue -->
<template>
  <div>
    <!-- Form -->
    <template v-if="!done">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">New password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Min. 8 characters"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif transition-colors"
          >
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Confirm password</label>
          <input
            v-model="confirm"
            type="password"
            placeholder="Repeat password"
            required
            autocomplete="new-password"
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
          <span v-else>Update password →</span>
        </button>
      </form>

      <!-- Escape hatch: a user who lands here without meaning to (stale link,
           changed their mind) previously had NOWHERE to go. -->
      <p class="text-center mt-6 text-sm text-ink-muted">
        <NuxtLink to="/login" class="text-flame font-semibold hover:underline">← Back to sign in</NuxtLink>
      </p>
    </template>

    <!-- Success state -->
    <div v-else class="text-center py-4 flex flex-col items-center gap-3">
      <span class="text-5xl">✅</span>
      <p class="text-base font-bold text-ink">Password updated!</p>
      <p class="text-sm text-ink-muted">Redirecting you to the app…</p>
    </div>
  </div>
</template>

<script setup>
// app/pages/reset-password.vue
// Chrome (background, card, brand mark, "← Back to home") lives in
// app/layouts/auth.vue. This page previously had ZERO navigation of any kind —
// a stale reset link dropped the user into a form with no way out.
definePageMeta({
  layout:   'auth',
  subtitle: 'Choose a new password',
})

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