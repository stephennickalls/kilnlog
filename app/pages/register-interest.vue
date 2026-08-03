<!-- app/pages/register-interest.vue -->
<!--
  Beta recruitment page (see BETA-TEMP edits in middleware/auth.js +
  subscribe.vue). Chrome lives in app/layouts/auth.vue.

  DUAL-MODE, driven by /api/beta-slots (cap = public.app_settings.beta_max_slots,
  UPDATE to change, no deploy):
    - remaining > 0 → account creation, immediate access. The auth.users
      trigger hard-enforces the cap; last slot gets a congratulations.
    - remaining = 0 → waitlist (original /api/beta-interest flow).
    - fetch failed  → explicit error state. NEVER a slot-count sentence:
      a failed fetch used to render "all 0 spots are taken".

  NO EMAIL CONFIRMATION (Aug 2026): "Confirm email" is DISABLED in Supabase
  (Authentication → Providers → Email). signUp therefore returns a session
  straight away and sends nothing — which also sidesteps the built-in SMTP's
  2-emails-per-hour cap that was 429ing signups. So: on success we show a
  brief congratulations and drop the user into /app already signed in.
  If confirmation is ever re-enabled, signUp returns session: null and the
  page falls back to the "check your email" state below — no code change.

  Only email + password are required in either mode — name is optional
  everywhere, so an empty name stores null rather than ''.

  ERROR COPY: Supabase Auth messages are raw. friendlyAuthError() maps the
  common ones; anything unmapped falls through verbatim. Note "Email address X
  is invalid" is returned for placeholder addresses (test@gmail.com, a@b.com),
  not for genuine typos.

  MOBILE: inputs are `text-base sm:text-sm` — iOS Safari zooms sub-16px inputs.
-->
<template>
  <div>
    <!-- Loading -->
    <p v-if="pending" class="text-center text-sm text-ink-muted py-4">
      Checking available spots…
    </p>

    <!-- Fetch failed — no counts shown -->
    <div v-else-if="slotsError" class="text-center py-4 flex flex-col items-center gap-3">
      <span class="text-5xl">🔧</span>
      <p class="text-base font-bold text-ink">We couldn't load early access right now</p>
      <p class="text-sm text-ink-muted">Please try again in a moment.</p>
      <button
        class="text-flame font-semibold text-sm hover:underline"
        @click="refresh()"
      >
        Retry
      </button>
    </div>

    <!-- ══ MODE A: spots free — create account ══ -->
    <template v-else-if="slots.remaining > 0">
      <!-- Signed in already — heading to the app -->
      <div v-if="accountCreated && signedIn" class="text-center py-4 flex flex-col items-center gap-3">
        <span class="text-5xl">{{ tookLastSlot ? '🏆' : '🎉' }}</span>
        <p class="text-base font-bold text-ink">
          {{ tookLastSlot ? 'You got the last spot!' : 'You\'re in!' }}
        </p>
        <p class="text-sm text-ink-muted">Taking you to your kiln…</p>
      </div>

      <!-- Fallback: confirmation re-enabled, no session returned -->
      <div v-else-if="accountCreated" class="text-center py-4 flex flex-col items-center gap-3">
        <span class="text-5xl">{{ tookLastSlot ? '🏆' : '🎉' }}</span>
        <p class="text-base font-bold text-ink">
          {{ tookLastSlot ? 'You got the last spot!' : 'Your spot is claimed!' }}
        </p>
        <p class="text-sm text-ink-muted leading-relaxed">
          Confirm your email at <strong class="text-ink">{{ email }}</strong>, then sign in.
        </p>
        <p class="text-sm text-ink-muted leading-relaxed bg-flame-bg border border-flame/20 rounded-lg px-3.5 py-2.5">
          📬 Check your <strong class="text-ink">spam folder</strong> — adding
          <strong class="text-ink">kilnmonitor@gmail.com</strong> to your contacts helps.
        </p>
      </div>

      <template v-else>
        <div class="text-center bg-flame-bg border border-flame rounded-lg px-4 py-2.5 text-sm font-semibold text-flame mb-4">
          {{ slots.remaining }} of {{ slots.total }}
          {{ slots.remaining === 1 ? 'spot' : 'spots' }} left
        </div>

        <p class="text-sm text-ink-muted text-center mb-5 leading-relaxed">
          A spot is free — create your account and start firing straight away.
          <strong class="text-ink">12 months free</strong> in exchange for your feedback.
        </p>

        <form class="flex flex-col gap-4" @submit.prevent="createAccount">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Password</label>
            <input
              v-model="password"
              type="password"
              placeholder="Min. 8 characters"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Name <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <input
              v-model="name"
              type="text"
              placeholder="Jane Smith"
              autocomplete="name"
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">What do you fire? <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <textarea
              v-model="message"
              rows="3"
              maxlength="2000"
              placeholder="e.g. wood, gas, hybrid, cone 6, cone 10..."
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif resize-none"
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
            <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            <span v-else>Claim your spot →</span>
          </button>

          <p class="text-center text-xs text-ink-faint">No credit card required.</p>
        </form>

        <p class="text-center mt-5 text-sm text-ink-muted">
          Already have an account?
          <NuxtLink to="/login" class="text-flame font-semibold hover:underline">Sign in</NuxtLink>
        </p>
      </template>
    </template>

    <!-- ══ MODE B: full — waitlist ══ -->
    <template v-else>
      <div v-if="done" class="text-center py-4 flex flex-col items-center gap-3">
        <span class="text-5xl">🎉</span>
        <p class="text-base font-bold text-ink">You're on the list!</p>
        <p class="text-sm text-ink-muted leading-relaxed">
          We'll email <strong class="text-ink">{{ email }}</strong> as soon as a spot opens.
        </p>
        <p class="text-sm text-ink-muted leading-relaxed bg-flame-bg border border-flame/20 rounded-lg px-3.5 py-2.5">
          📬 Check your <strong class="text-ink">spam folder</strong> — adding
          <strong class="text-ink">kilnmonitor@gmail.com</strong> to your contacts helps.
        </p>
      </div>

      <template v-else>
        <p class="text-sm text-ink-muted text-center mb-5 leading-relaxed">
          All {{ slots.total }} early access spots are taken. Join the waitlist
          and we'll email you the moment one opens —
          <strong class="text-ink">12 months free</strong> when it does.
        </p>

        <form class="flex flex-col gap-4" @submit.prevent="submitWaitlist">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Name <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <input
              v-model="name"
              type="text"
              placeholder="Jane Smith"
              autocomplete="name"
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">What do you fire? <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <textarea
              v-model="message"
              rows="3"
              maxlength="2000"
              placeholder="e.g. wood, gas, hybrid, cone 6, cone 10..."
              class="w-full border border-parchment-3 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif resize-none"
            />
          </div>

          <!-- Honeypot — bots fill it, humans never see it. -->
          <input
            v-model="website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            class="absolute -left-[9999px] top-0 h-0 w-0 opacity-0 pointer-events-none"
          >

          <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 bg-flame text-parchment py-3 rounded-lg text-base font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 font-serif"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            <span v-else>Join the waitlist →</span>
          </button>

          <p class="text-center text-xs text-ink-faint">
            No spam — just an email when your spot opens.
          </p>
        </form>
      </template>
    </template>
  </div>
</template>

<script setup>
// app/pages/register-interest.vue
definePageMeta({
  layout:   'auth',
  subtitle: 'Get early access',
})

const supabase = useSupabaseClient()

const email    = ref('')
const name     = ref('')
const password = ref('')
const message  = ref('')
const website  = ref('')   // honeypot (waitlist mode)
const error    = ref('')
const loading  = ref(false)
const done     = ref(false)

const accountCreated = ref(false)
const signedIn       = ref(false)
const tookLastSlot   = ref(false)

// SSR'd so the correct mode renders on first paint — no flash, no guessing.
const { data: slots, pending, error: slotsError, refresh } =
  await useFetch('/api/beta-slots')

// Supabase Auth error strings → copy a potter can act on.
function friendlyAuthError(msg = '') {
  if (/is invalid/i.test(msg))                       return "That email address was rejected — please use a real address (placeholder addresses like test@gmail.com won't work)."
  if (/already registered|already exists/i.test(msg)) return 'That email already has an account — try signing in instead.'
  if (/password/i.test(msg) && /short|least|6|8/i.test(msg)) return 'Please use a password of at least 8 characters.'
  if (/rate limit|too many|429/i.test(msg))          return 'Too many attempts — please wait a moment and try again.'
  return msg || 'Something went wrong. Please try again.'
}

async function createAccount() {
  loading.value = true
  error.value   = ''
  const wasLast = slots.value?.remaining === 1

  // No emailRedirectTo: confirmation is disabled, so no email is sent.
  const { data, error: err } = await supabase.auth.signUp({
    email:    email.value.trim(),
    password: password.value,
    options:  {
      data: { full_name: name.value || null, kiln_info: message.value || null },
    },
  })

  if (err) {
    loading.value = false
    // auth.users trigger raises 'beta_full' if the last spot went in a race.
    if (/beta_full|spots are taken/i.test(err.message || '')) {
      error.value = 'Sorry — that spot was just taken.'
      await refresh()
    } else {
      error.value = friendlyAuthError(err.message)
    }
    return
  }

  tookLastSlot.value   = wasLast
  accountCreated.value = true
  signedIn.value       = !!data?.session
  loading.value        = false

  // Confirmation off → session in hand. Brief celebration, then into the app.
  if (signedIn.value) {
    setTimeout(() => navigateTo('/app'), 1600)
  }
}

async function submitWaitlist() {
  loading.value = true
  error.value   = ''
  try {
    await $fetch('/api/beta-interest', {
      method: 'POST',
      body: {
        email:   email.value,
        name:    name.value,
        message: message.value,
        website: website.value,
      },
    })
    done.value = true
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>