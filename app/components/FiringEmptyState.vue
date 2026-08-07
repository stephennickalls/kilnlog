<!-- app/components/FiringEmptyState.vue -->
<!--
  Shown when no firing is selected. Doubles as first-run welcome and a
  returning-user launchpad. `recentFiring` (optional) surfaces a one-tap
  path back into context; absent for brand-new users.

  "Browse schedules" carries a celadon hint — it's the entry point to the
  schedules world (which is celadon-accented), so the colour telegraphs the
  destination before the user arrives.

  ICONS (Aug 2026): the 🔥 emoji is replaced with the BrandFlame SVG component,
  sized to fill the badge circle properly (the first pass was too small and left
  a lot of empty white around it).

  G5: if a firing is active (rare here — the active firing is usually the
  selected one — but possible, e.g. after deleting the selected past firing),
  the "Start a firing" CTA is disabled with a note. "Browse schedules" stays
  enabled; navigating away is always fine.
-->
<template>
  <div class="flex flex-col items-center justify-center text-center gap-5 px-4 sm:px-6 py-10 sm:py-16 h-full min-w-0">

    <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border border-parchment-3 flex items-center justify-center" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
      <BrandFlame class="w-11 h-11 sm:w-14 sm:h-14" />
    </div>

    <div class="max-w-md">
      <h2 class="text-xl sm:text-2xl font-bold text-ink mb-1.5">
        {{ recentFiring ? 'Ready when your kiln is' : 'Start your first firing' }}
      </h2>
      <p class="text-sm sm:text-base text-ink-muted leading-relaxed">
        {{ recentFiring
          ? 'Start a firing to log temperatures live, or pick up a past firing to review its curve.'
          : 'Plan it, log it, learn from it. Record the whole curve as it happens — so the firing you want to repeat is one you actually can.' }}
      </p>
    </div>

    <div class="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto max-w-xs sm:max-w-none">
      <button
        class="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 min-h-[44px] bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!!activeFiring"
        :title="activeFiring ? 'A firing is already active — only one at a time' : ''"
        @click="$emit('start')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        Start a firing
      </button>
      <!-- Celadon hint: this button leads to the schedules world -->
      <button class="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 min-h-[44px] border border-celadon/40 bg-celadon-bg/60 text-celadon-dark hover:bg-celadon-bg text-sm font-semibold rounded-xl transition-colors" @click="$emit('browse-schedules')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
        Browse schedules
      </button>
    </div>

    <!-- G5: explain the disabled Start CTA -->
    <p v-if="activeFiring" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs leading-relaxed">
      <strong class="font-semibold">{{ activeFiring.name }}</strong> is still firing — only one firing at a time. End it from the sidebar first.
    </p>

    <!-- Most-recent shortcut.
         MOBILE (Aug 2026): this row had a fixed max-w-[160px] on the name plus
         a "Most recent —" label, an icon and a chevron, with nothing allowed to
         shrink — about 300px of content in the 240px available at 320px, so it
         pushed past the card edge (visible in the reported screenshots as the
         chevron sitting on the screen border). The label now hides on the
         narrowest screens, the row is width-capped, and the name truncates
         against whatever space is actually left rather than a fixed number. -->
    <button
      v-if="recentFiring"
      class="mt-1 flex items-center gap-2 min-w-0 max-w-full bg-white border border-parchment-3 rounded-xl px-3 sm:px-4 py-2.5 min-h-[44px] hover:border-flame/40 transition-colors"
      style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      @click="$emit('select-recent', recentFiring)"
    >
      <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      <span class="hidden min-[380px]:inline text-xs sm:text-sm text-ink-muted shrink-0">Most recent —</span>
      <span class="text-xs sm:text-sm font-semibold text-ink truncate min-w-0">{{ recentFiring.name }}</span>
      <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  recentFiring: { type: Object, default: null },
  activeFiring: { type: Object, default: null },   // G5: disables the Start CTA
})
defineEmits(['start', 'browse-schedules', 'select-recent'])
</script>