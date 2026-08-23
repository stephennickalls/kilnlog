<!-- File: app/components/DemoFiringBanner.vue -->
<!--
  Shown above the console whenever the selected firing has is_demo set. Two
  jobs, and the first matters more: make it impossible to mistake demo data for
  a real firing. A potter who later finds "Demo firing" in their history and
  can't remember whether they fired it has lost trust in the whole log.

  Second job is the exit. Deleting the demo frees the one-active-firing slot,
  which is exactly what someone needs to do before their first real firing, so
  the action lives here rather than buried in Account.

  MOBILE: NOTHING RENDERS (Aug 2026). This went through two rounds. First the
  desktop block was shown at every width, and on a phone it pushed the console
  and chart down far enough to matter. Then it collapsed below sm to a single
  tappable strip, which was smaller but still spent a whole row of the one
  screen where rows are scarcest. It is now desktop-only.

  That is a deliberate trade, not a tidy-up, and it costs something real: on a
  phone there is now NO on-screen warning that the data is fake, and no way to
  delete the demo without going to a desktop. If you want the warning back
  without the row, the cheap version is a small "DEMO" chip beside the firing
  name in the header — a chip inside an existing line costs no vertical space at
  all — and a "Delete demo" entry in the console's ⋮ sheet, which is where every
  other firing-level action already lives.

  Deliberately NOT dismissible: for as long as it renders it must be present for
  the whole life of the demo, not just the first look. A dismissed warning is
  how fake data ends up mistaken for real.

  Emits @delete. The parent owns the request and the navigation afterwards.
-->
<template>
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