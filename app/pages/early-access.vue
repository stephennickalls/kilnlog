<!-- File: app/pages/early-access.vue -->
<!--
  Early-access recruitment page (see BETA-TEMP edits in middleware/auth.js +
  subscribe.vue). Chrome lives in app/layouts/auth.vue.

  DUAL-MODE, driven by /api/beta-slots (cap = public.app_settings.beta_max_slots,
  UPDATE to change, no deploy):
    - remaining > 0 → account creation, immediate access. The auth.users
      trigger hard-enforces the cap; last slot gets a congratulations.
    - remaining = 0 → waitlist (original /api/beta-interest flow).
    - fetch failed  → explicit error state.

  COPY (Aug 2026): NO COUNTS ARE RENDERED — not spots remaining, not testers
  joined, not the total. A countdown ("3 spots left") reads as manufactured
  scarcity, and a join count is unflattering while the group is genuinely
  small. The pill now carries qualitative social proof instead. slots.remaining
  still drives WHICH MODE renders; it just never reaches the DOM. If you ever
  want a number back, the group has to be big enough that the number helps —
  don't reintroduce it below ~50.

  SLOTS PILL: bg-ink + the flame radial-gradient, i.e. the same dark brown as
  BetaBanner.vue — keep the two in sync if that gradient changes.

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

  MOBILE: inputs were already `text-base sm:text-sm` — iOS Safari zooms
  sub-16px inputs and never zooms back out. They now use the shared .input,
  which encodes exactly that rule in one place, so this page can't drift back.
  The confirmation states echo the address the user typed; those are wrapped in
  `break-all` because an unbroken email is wider than a 320px card and pushed
  the whole page sideways.

  LOADING (Aug 2026): the slots fetch is NOT awaited — see the comment on
  useFetch below. Awaiting it blocked the route transition, so clicking
  "Get early access" anywhere on the site looked like nothing had happened
  for 1–4 seconds. The `pending` block at the top of the template is what
  the user now sees instead.
-->
<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="py-6 flex flex-col items-center gap-3">
      <span class="w-6 h-6 border-2 border-parchment-3 border-t-flame rounded-full animate-spin"/>
      <p class="text-sm text-ink-muted">Checking availability…</p>
    </div>

    <!-- Fetch failed — no counts shown -->
    <div v-else-if="slotsError" class="text-center py-4 flex flex-col items-center gap-3">
      <span class="text-5xl">🔧</span>
      <p class="text-base font-bold text-ink">We couldn't load early access right now</p>
      <p class="text-sm text-ink-muted">Please try again in a moment.</p>
      <button
        class="text-flame font-semibold text-sm hover:underline py-1"
        @click="refresh()"
      >
        Retry
      </button>
    </div>

    <!-- ══ MODE A: spots free — create account ══ -->
    <template v-else-if="slots?.remaining > 0">
      <!-- Signed in already — heading to the app -->
      <div v-if="accountCreated && signedIn" class="text-center py-4 flex flex-col items-center gap-3">
        <span class="text-5xl">{{ tookLastSlot ? '🏆' : '🎉' }}</span>
        <p class="text-base font-bold text-ink">
          {{ tookLastSlot ? 'You\'re in — and that was the last spot!' : 'You\'re in!' }}
        </p>
        <p class="text-sm text-ink-muted">Taking you to your kiln…</p>
      </div>

      <!-- Fallback: confirmation re-enabled, no session returned -->
      <div v-else-if="accountCreated" class="text-center py-4 flex flex-col items-center gap-3">
        <span class="text-5xl">{{ tookLastSlot ? '🏆' : '🎉' }}</span>
        <p class="text-base font-bold text-ink">
          {{ tookLastSlot ? 'Your spot is claimed — and that was the last one!' : 'Your spot is claimed!' }}
        </p>
        <p class="text-sm text-ink-muted leading-relaxed">
          Confirm your email at <strong class="text-ink break-all">{{ email }}</strong>, then sign in.
        </p>
        <p class="text-sm text-ink-muted leading-relaxed bg-flame-bg border border-flame/20 rounded-lg px-3.5 py-2.5">
          📬 Check your <strong class="text-ink">spam folder</strong> — adding
          <strong class="text-ink break-all">kilnmonitor@gmail.com</strong> to your contacts helps.
        </p>
      </div>

      <template v-else>
        <!-- Dark brown pill — same treatment as BetaBanner.vue. NO COUNTS. -->
        <div
          class="text-center bg-ink text-parchment rounded-lg px-4 py-2.5 text-sm font-bold mb-4 font-serif"
          style="background-image: radial-gradient(ellipse at 15% 50%, rgba(176,92,26,0.18) 0%, transparent 60%)"
        >
          Join our small group of testers
        </div>

        <p class="text-sm text-ink-muted text-center mb-5 leading-relaxed">
          We're working closely with a handful of potters to shape KilnMonitor.
          Create your account and start firing straight away —
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
              class="input rounded-lg px-3.5 py-2.5 focus:border-flame focus:ring-flame/10"
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
              class="input rounded-lg px-3.5 py-2.5 focus:border-flame focus:ring-flame/10"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Name <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <input
              v-model="name"
              type="text"
              placeholder="Jane Smith"
              autocomplete="name"
              class="input rounded-lg px-3.5 py-2.5 focus:border-flame focus:ring-flame/10"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">What do you fire? <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <textarea
              v-model="message"
              rows="3"
              maxlength="2000"
              placeholder="e.g. wood, gas, hybrid, cone 6, cone 10..."
              class="input rounded-lg px-3.5 py-2.5 resize-none focus:border-flame focus:ring-flame/10"
            />
          </div>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full min-h-[44px] flex items-center justify-center gap-2 bg-flame text-parchment py-3 rounded-lg text-base font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 font-serif"
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
          We'll email <strong class="text-ink break-all">{{ email }}</strong> as soon as a spot opens.
        </p>
        <p class="text-sm text-ink-muted leading-relaxed bg-flame-bg border border-flame/20 rounded-lg px-3.5 py-2.5">
          📬 Check your <strong class="text-ink">spam folder</strong> — adding
          <strong class="text-ink break-all">kilnmonitor@gmail.com</strong> to your contacts helps.
        </p>
      </div>

      <template v-else>
        <!-- Still explains WHY there's a waitlist, without a countdown. -->
        <div
          class="text-center bg-ink text-parchment rounded-lg px-4 py-2.5 text-sm font-bold mb-4 font-serif"
          style="background-image: radial-gradient(ellipse at 15% 50%, rgba(176,92,26,0.18) 0%, transparent 60%)"
        >
          Our testing group is full for now
        </div>

        <p class="text-sm text-ink-muted text-center mb-5 leading-relaxed">
          We keep the group small so we can work closely with everyone in it.
          Join the waitlist and we'll email you the moment a spot opens —
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
              class="input rounded-lg px-3.5 py-2.5 focus:border-flame focus:ring-flame/10"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">Name <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <input
              v-model="name"
              type="text"
              placeholder="Jane Smith"
              autocomplete="name"
              class="input rounded-lg px-3.5 py-2.5 focus:border-flame focus:ring-flame/10"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-widest text-ink-faint">What do you fire? <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
            <textarea
              v-model="message"
              rows="3"
              maxlength="2000"
              placeholder="e.g. wood, gas, hybrid, cone 6, cone 10..."
              class="input rounded-lg px-3.5 py-2.5 resize-none focus:border-flame focus:ring-flame/10"
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
            class="w-full min-h-[44px] flex items-center justify-center gap-2 bg-flame text-parchment py-3 rounded-lg text-base font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 font-serif"
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
// app/pages/early-access.vue
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
//
// LOADING (Aug 2026): deliberately NOT awaited. A top-level `await useFetch`
// blocks the ROUTE TRANSITION — Nuxt won't render this page until it resolves
// — so the `pending` branch could never appear, and clicking "Get early
// access" left the user staring at the previous page for 1–4 seconds with no
// sign anything had happened. lazy:true renders immediately and lets the
// loading state do its job. Still SSRs on a hard load; only client-side
// navigation changes.
//
// CONSEQUENCE: `slots` is null while pending, which is why MODE A tests
// `slots?.remaining`. The pending and slotsError branches must stay ABOVE it
// in the template — they're what covers the null window.
//
// slots.remaining is now used ONLY to pick a mode and to set tookLastSlot.
// Neither it nor slots.total is rendered anywhere. See the COPY note above.
const { data: slots, pending, error: slotsError, refresh } =
  useFetch('/api/beta-slots', { lazy: true })

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
      error.value = 'Sorry — the group just filled up.'
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