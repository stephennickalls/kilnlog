<!-- app/pages/register-interest.vue -->
<!--
  TEMPORARY beta-recruitment page. Replaces /subscribe while we recruit
  testers (see BETA-TEMP edits in middleware/auth.js + subscribe.vue).
  Uses the shared auth layout for the card/brand/back-link chrome.

  MOBILE NOTE: inputs are `text-base sm:text-sm` — a deliberate deviation
  from login/signup's plain `text-sm`. iOS Safari auto-zooms any focused
  input whose font-size is under 16px; since most beta signups will come
  from phones, this page uses 16px on mobile to prevent that. Desktop
  renders 14px, identical to the other auth pages.
-->
<template>
  <div>
    <!-- Success state — mirrors forgot-password.vue -->
    <div v-if="done" class="text-center py-4 flex flex-col items-center gap-3">
      <span class="text-5xl">🎉</span>
      <p class="text-base font-bold text-ink">You're on the list!</p>
      <p class="text-sm text-ink-muted leading-relaxed">
        We sent a confirmation to <strong class="text-ink">{{ email }}</strong>.
        We'll be in touch when beta spots open up.
      </p>
    </div>

    <template v-else>
      <p class="text-sm text-ink-muted text-center mb-5 leading-relaxed">
        We're picking a small group of potters to beta test KilnMonitor.
        Chosen testers get <strong class="text-ink">12 months free</strong> —
        in return we'd love your feedback, bug reports, and feature ideas.
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

        <!-- Honeypot — visually removed, bots fill it, humans never see it.
             tabindex=-1 keeps it out of mobile keyboard "next field" flow. -->
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
          <span v-else>Register my interest →</span>
        </button>

        <p class="text-center text-xs text-ink-faint">
          No spam — just an email when beta spots open.
        </p>
      </form>
    </template>
  </div>
</template>

<script setup>
// app/pages/register-interest.vue
// Chrome (background, card, brand mark, "← Back to home") lives in
// app/layouts/auth.vue. This file is just the interest form.
definePageMeta({
  layout:   'auth',
  subtitle: 'Become a beta tester',
})

const email   = ref('')
const name    = ref('')
const message = ref('')
const website = ref('')   // honeypot
const error   = ref('')
const loading = ref(false)
const done    = ref(false)

async function submit() {
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