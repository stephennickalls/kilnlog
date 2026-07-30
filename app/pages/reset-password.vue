<!-- app/pages/reset-password.vue -->
<template>
  <div>
    <!-- Verifying the link (code exchange / OTP verify happens on mount) -->
    <div v-if="verifying" class="text-center py-8 flex flex-col items-center gap-3">
      <span class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
      <p class="text-sm text-ink-muted">Checking your reset link…</p>
    </div>

    <!-- Link is bad: expired, already used, or opened in a different browser -->
    <div v-else-if="linkError" class="flex flex-col gap-4">
      <div class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3 leading-relaxed">
        {{ linkError }}
      </div>
      <NuxtLink
        to="/forgot-password"
        class="w-full flex items-center justify-center bg-flame text-parchment py-3 rounded-xl text-sm font-bold hover:bg-flame-dark transition-colors"
      >
        Send a new reset link →
      </NuxtLink>
      <p class="text-center text-sm text-ink-muted">
        <NuxtLink to="/login" class="text-flame font-semibold hover:underline">← Back to sign in</NuxtLink>
      </p>
    </div>

    <!-- Form -->
    <template v-else-if="!done">
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
// app/layouts/auth.vue.
//
// RECOVERY-LINK HANDLING (Jul 2026): this page used to render the form
// unconditionally and call updateUser() with no session, so a stale, consumed,
// or cross-browser link produced a raw API error inside the form instead of
// "your link expired, get a new one". A recovery link can arrive in FOUR
// shapes depending on the Supabase flow type and email template:
//
//   1. ?code=<uuid>                  — PKCE (supabase-js default). Requires the
//                                      code_verifier stored in THIS browser's
//                                      localStorage, so a link requested on
//                                      desktop and opened on a phone CANNOT
//                                      work. That failure is now explained.
//   2. ?token_hash=..&type=recovery  — works on any device. Requires the email
//                                      template to use {{ .TokenHash }} (see
//                                      the custom template).
//   3. #access_token=..&type=recovery — implicit flow (older projects).
//   4. ?error=..&error_description=.. — Supabase rejected it before redirecting
//                                      (expired, already used).
//
// detectSessionInUrl (on by default in our client) already consumes shapes 1
// and 3 automatically, but asynchronously — so we poll briefly for a session
// before deciding a link is bad, then fall back to handling 2 ourselves.
definePageMeta({
  layout:   'auth',
  subtitle: 'Choose a new password',
})

const supabase = useSupabaseClient()
const route    = useRoute()

const password  = ref('')
const confirm   = ref('')
const error     = ref('')
const linkError = ref('')
const loading   = ref(false)
const verifying = ref(true)
const done      = ref(false)

const EXPIRED_MSG =
  'This reset link has expired or was already used. Request a new one and open it in the same browser you requested it from.'

function hashParams() {
  if (!import.meta.client || !window.location.hash) return new URLSearchParams()
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

async function waitForSession(attempts = 10, delayMs = 150) {
  for (let i = 0; i < attempts; i++) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return session
    await new Promise(r => setTimeout(r, delayMs))
  }
  return null
}

onMounted(async () => {
  const hash = hashParams()

  // Shape 4 — Supabase already rejected the token.
  const errDesc = route.query.error_description ?? hash.get('error_description')
  if (errDesc) {
    linkError.value = String(errDesc).replace(/\+/g, ' ') || EXPIRED_MSG
    verifying.value = false
    return
  }

  // Shape 2 — token_hash works on ANY device, so try it before waiting on
  // detectSessionInUrl (which can only resolve shapes 1 and 3).
  const tokenHash = route.query.token_hash ?? route.query.token
  const type      = route.query.type ?? hash.get('type')
  if (tokenHash && (!type || type === 'recovery')) {
    const { error: otpErr } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: String(tokenHash),
    })
    if (otpErr) {
      linkError.value = EXPIRED_MSG
      verifying.value = false
      return
    }
    verifying.value = false
    return
  }

  // Shapes 1 and 3 — detectSessionInUrl handles the exchange in the background.
  const session = await waitForSession()
  if (!session) {
    // A ?code= that never produced a session is almost always the cross-browser
    // PKCE case: the code_verifier lives in the browser that asked for the link.
    linkError.value = route.query.code
      ? 'This link was opened in a different browser than the one that requested it, or it has expired. Request a new link and open it in the same browser.'
      : EXPIRED_MSG
  }
  verifying.value = false
})

async function submit() {
  error.value = ''
  if (password.value !== confirm.value) { error.value = 'Passwords do not match'; return }
  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false
  if (err) {
    // A session that vanished mid-form is the same problem as a bad link.
    error.value = /session|jwt|token/i.test(err.message) ? EXPIRED_MSG : err.message
    return
  }
  done.value = true
  setTimeout(() => navigateTo('/app'), 1500)
}
</script>