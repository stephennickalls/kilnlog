<!-- app/layouts/auth.vue -->
<!--
  Shared chrome for every unauthenticated page: login, signup, forgot-password,
  reset-password.

  Before this existed, all four pages carried `layout: false` (which did nothing
  — there is no layouts/default.vue) and hand-rolled their own background, card,
  and brand mark. They had drifted: two used a text wordmark, two a stacked 🔥
  emoji; card widths and shadows differed. Worse, forgot-password and
  reset-password were dead ends — reset-password had no navigation of ANY kind,
  so a stale reset link stranded the user completely.

  Everything shared now lives here:
    - page background (parchment + warm radial wash)
    - the card
    - brand mark, clickable → /
    - an EXPLICIT "← Back to home" link. A clickable logo is a convention, not
      a signpost; someone half-way through signing up shouldn't need to know the
      convention to get out.

  Usage — pages set the layout and their own subtitle line via page meta:

    definePageMeta({
      layout: 'auth',
      subtitle: 'Sign in to your account',
    })

  NOTE: this is unrelated to app/middleware/auth.js. That is a route GUARD
  (may you see this page?); this is a LAYOUT (what does the page sit inside?).
  Shared name, different jobs, different directories.
-->
<template>
  <div
    class="min-h-screen bg-parchment font-serif flex flex-col items-center justify-center px-6 py-10"
    style="background-image: radial-gradient(circle at 20% 80%, rgba(176,92,26,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(176,92,26,0.04) 0%, transparent 60%)"
  >
    <div class="w-full max-w-md bg-white border border-parchment-3 rounded-2xl p-8 sm:p-10" style="box-shadow: 0 4px 24px rgba(58,30,8,0.08)">

      <!-- Brand — clickable, matches the in-app header mark -->
      <div class="text-center mb-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-2xl sm:text-3xl font-bold text-ink tracking-tight hover:text-flame transition-colors"
        >
          <span aria-hidden="true">🔥</span>
          <span>KilnMonitor</span>
        </NuxtLink>
        <p v-if="subtitle" class="text-sm text-ink-muted italic mt-1">{{ subtitle }}</p>
      </div>

      <!-- Page content -->
      <slot/>

    </div>

    <!-- Explicit escape hatch. Sits OUTSIDE the card so it reads as
         "leave this page", not "another form action". -->
    <NuxtLink
      to="/"
      class="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-flame transition-colors"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to home
    </NuxtLink>

  </div>
</template>

<script setup>
// Each page declares its own subtitle in definePageMeta; read it from route meta.
const route = useRoute()
const subtitle = computed(() => route.meta.subtitle ?? '')
</script>