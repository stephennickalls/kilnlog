<!-- File: app/components/DemoFiringBanner.vue -->
<!--
  Shown above the console whenever the selected firing has is_demo set. Two
  jobs, and the first matters more: make it impossible to mistake demo data for
  a real firing. A potter who later finds "Demo firing" in their history and
  can't remember whether they fired it has lost trust in the whole log.

  Second job is the exit. Deleting the demo frees the one-active-firing slot,
  which is exactly what someone needs to do before their first real firing, so
  the action lives here rather than buried in Account.

  MOBILE (Aug 2026): the desktop banner is a full block — badge, two lines of
  explanation, separate button — and on a phone it pushed the console and chart
  down far enough to matter. The chart is the thing people came to look at.
  Below sm this collapses to ONE tappable strip: the whole row is the button, so
  the 44px target is met without a separate control competing for width. Tapping
  it opens the same ConfirmDialog the desktop button does, so an accidental tap
  costs nothing.

  Deliberately NOT dismissible on either breakpoint: it must be present for the
  whole life of the demo, not just the first look. A dismissed warning is how
  fake data ends up mistaken for real.

  Emits @delete. The parent owns the request and the navigation afterwards.
-->
<template>
  <!-- ── Mobile: one tappable strip ──────────────────────────────────────── -->
  <button
    class="sm:hidden w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border border-flame/30 bg-flame-bg text-left transition-colors active:bg-flame/15 disabled:opacity-50"
    :disabled="busy"
    @click="$emit('delete')"
  >
    <span class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-flame text-parchment">
      Demo
    </span>
    <span class="flex-1 min-w-0 text-[11px] text-ink leading-snug truncate">
      {{ busy ? 'Deleting…' : 'Not a real firing. Tap to delete.' }}
    </span>
    <svg class="w-4 h-4 shrink-0 text-flame" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
  </button>

  <!-- ── Desktop: full banner ────────────────────────────────────────────── -->
  <div class="hidden sm:flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-flame/30 bg-flame-bg">
    <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-flame text-parchment">
      Demo
    </span>
    <p class="flex-1 min-w-[12rem] text-xs text-ink leading-relaxed">
      This firing isn't real — it's here so you can try everything safely.
      Delete it when you're ready to log your own.
    </p>
    <button
      class="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border border-flame/40 text-flame hover:bg-flame hover:text-parchment transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="busy"
      @click="$emit('delete')"
    >
      {{ busy ? 'Deleting…' : 'Delete demo' }}
    </button>
  </div>
</template>

<script setup>
// app/components/DemoFiringBanner.vue
defineProps({
  busy: { type: Boolean, default: false },
})

defineEmits(['delete'])
</script>