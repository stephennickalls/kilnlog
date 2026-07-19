<!-- app/components/BetaBanner.vue -->
<!--
  BETA-TEMP: top-of-page beta announcement bar. Drop-in — Nuxt auto-imports
  from app/components/, so just render <BetaBanner /> as the first child of the
  landing page root. Remove that one line (and this file) to revert.

  MOBILE NOTES (iPhone-width ~375px):
    - Layout is flex-col by default, flex-row only at sm:. On a phone the pill,
      copy, and CTA stack and each spans full width — nothing gets crushed onto
      one overflowing line.
    - The CTA is a real block button on mobile (w-full, py-2.5) so it's a proper
      tap target, not an inline text link you have to pinch at.
    - `text-balance` + tightened leading keeps the headline from becoming a
      lopsided 3-line ragged block on narrow screens.
    - No fixed heights: the bar grows with its content so nothing clips when the
      copy wraps.
-->
<template>
  <div class="bg-ink text-parchment font-serif" style="background-image: radial-gradient(ellipse at 15% 50%, rgba(176,92,26,0.18) 0%, transparent 60%)">
    <div class="max-w-[1200px] mx-auto px-5 sm:px-10 py-3 sm:py-2.5 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">

      <!-- Status pill -->
      <span class="inline-flex items-center gap-1.5 shrink-0 bg-flame/15 border border-flame-light/40 text-flame-light rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em]">
        <span class="w-1.5 h-1.5 rounded-full bg-flame-light animate-pulse"/>
        Private beta
      </span>

      <!-- Copy -->
      <p class="text-[0.9rem] sm:text-[0.925rem] text-parchment/90 leading-snug text-balance sm:flex-1">
        We're in beta testing —
        <span class="font-semibold text-parchment">register now for free early access</span>
        and become a beta tester.
      </p>

      <!-- CTA: full-width block on mobile, compact inline on desktop -->
      <NuxtLink
        to="/register-interest"
        class="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 bg-flame text-parchment px-5 py-2.5 sm:py-1.5 rounded text-[0.875rem] font-semibold hover:bg-flame-dark transition-colors"
      >
        Become a beta tester
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </NuxtLink>

    </div>
  </div>
</template>