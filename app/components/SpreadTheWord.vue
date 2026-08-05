<!-- File: app/components/SpreadTheWord.vue -->
<!--
  Header button → popover with the shareable Facebook PNG.
  Image lives at public/share/kilnmonitor-facebook-post.png — referenced via a
  bound :src (plain runtime URL) rather than a static src, which Vite would
  try to rewrite into a build-time import and fail (public/ isn't importable).
  BETA-TEMP-ish: mainly useful during early access recruitment;
  harmless to keep after launch.
-->
<template>
  <div ref="root" class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-parchment-3 bg-white hover:bg-parchment-2 transition-colors text-sm font-semibold text-ink-muted"
      @click="open = !open"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>
      </svg>
      <span class="hidden lg:inline">Spread the word</span>
    </button>

    <Transition name="menu">
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-72 bg-white border border-parchment-3 rounded-xl p-4 z-50"
        style="box-shadow:0 8px 28px rgba(58,30,8,0.14)"
      >
        <p class="text-sm font-bold text-ink mb-1">Know a potter who'd want in?</p>
        <p class="text-sm text-ink-muted leading-relaxed mb-3">
          Share this image in your pottery groups — every tester helps us build the right thing.
        </p>

        <img :src="shareImg" alt="KilnMonitor early access" class="w-full rounded-lg border border-parchment-3 mb-3"/>

        <a :href="shareImg" download="kilnmonitor-early-access.png" class="inline-flex items-center gap-2 text-sm font-semibold text-flame hover:underline" @click="open = false">
          ↓ Download image
        </a>
      </div>
    </Transition>
  </div>
</template>

<script setup>
// app/components/SpreadTheWord.vue
const open = ref(false)
const root = ref(null)

// Served from public/ at runtime — keep as a plain string, not an import.
const shareImg = '/share/kilnmonitor-facebook-post.png'

function onClickOutside(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.menu-enter-active, .menu-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.menu-enter-from, .menu-leave-to       { opacity: 0; transform: translateY(-4px); }
</style>