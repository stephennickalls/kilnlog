<!-- File: app/components/FiringSidebarMobile.vue -->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden"
      style="background:rgba(26,18,8,0.6)"
      @click.self="$emit('close')"
    >
      <!-- 80vh is wrong on iOS for the same reason h-screen is: it measures
           against a viewport that includes Safari's chrome, so the sheet's
           footer button ended up below the fold. min() takes whichever the
           browser understands and the smaller of the two when it knows both. -->
      <div class="bg-parchment rounded-t-2xl flex flex-col w-full" style="max-height:80vh; max-height:min(80vh, 80dvh)">
        <div class="flex justify-center pt-3 pb-1 shrink-0"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
        <div class="flex items-center justify-between px-4 py-2 border-b border-parchment-3 shrink-0">
          <h2 class="text-sm font-bold text-ink">Firings</h2>
          <button class="p-2 -mr-1 text-ink-muted" aria-label="Close" @click="$emit('close')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <ul class="overflow-y-auto flex-1 divide-y divide-parchment-3">
          <li v-if="activeFiring">
            <button
              class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 transition-colors"
              :class="selectedId === activeFiring.id ? 'bg-celadon-bg border-l-2 border-celadon' : ''"
              @click="$emit('select', activeFiring)"
            >
              <div class="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse"/>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-ink truncate">{{ activeFiring.name }}</p>
                <p class="text-xs text-green-600 mt-0.5 font-semibold">Live</p>
              </div>
              <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </li>

          <li v-if="!pastFirings.length && !activeFiring" class="px-4 py-8 text-sm text-ink-muted text-center">No firings yet</li>

          <li v-for="f in pastFirings" :key="f.id" class="relative">
            <button
              class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 pr-16 transition-colors"
              :class="selectedId === f.id ? 'bg-celadon-bg border-l-2 border-celadon' : ''"
              @click="$emit('select', f)"
            >
              <div class="w-2 h-2 rounded-full bg-parchment-4 shrink-0"/>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink truncate">{{ f.name }}</p>
                <p class="text-xs text-ink-muted mt-0.5">{{ formatDate(f.created_at) }}</p>
              </div>
            </button>

            <!-- Two-tap delete. The confirm state is LOCAL to this component and
                 the sheet does NOT close on delete — clearing out old firings is
                 a run of deletes, and reopening the sheet each time was the bug
                 this component was extracted to fix. -->
            <div class="absolute right-3 top-1/2 -translate-y-1/2">
              <button
                v-if="confirmId !== f.id"
                class="p-2 text-parchment-4 active:text-red-400"
                aria-label="Delete firing"
                @click.stop="confirmId = f.id"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
              <button
                v-else
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 disabled:opacity-60"
                :disabled="deletingId === f.id"
                @click.stop="$emit('delete', f)"
              >{{ deletingId === f.id ? '…' : 'Delete?' }}</button>
            </div>
          </li>

          <!-- LAZY LIST (Aug 2026): older pages on demand. The sheet stays
               open — loading more shouldn't cost the user their place. -->
          <li v-if="hasMore">
            <button
              class="w-full px-4 py-4 text-sm font-semibold text-ink-muted active:bg-parchment-2 transition-colors disabled:opacity-50"
              :disabled="loadingMore"
              @click="$emit('load-more')"
            >{{ loadingMore ? 'Loading…' : 'Load older firings' }}</button>
          </li>
        </ul>

        <div class="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-parchment-3 shrink-0">
          <!-- G5: one firing at a time. The active firing is listed above to tap into. -->
          <button
            class="w-full py-3 bg-celadon hover:bg-celadon-dark text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!!activeFiring"
            @click="$emit('start')"
          >+ Start firing</button>
          <p v-if="activeFiring" class="text-[11px] text-ink-faint text-center mt-1.5 leading-snug">
            End <strong class="font-semibold">{{ activeFiring.name }}</strong> first — only one firing at a time.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/FiringSidebarMobile.vue
const props = defineProps({
  open:         { type: Boolean, default: false },
  selectedId:   { type: [Number, String], default: null },
  activeFiring: { type: Object, default: null },
  pastFirings:  { type: Array, default: () => [] },
  hasMore:      { type: Boolean, default: false },
  loadingMore:  { type: Boolean, default: false },
  deletingId:   { type: [Number, String], default: null },
})

defineEmits(['close', 'select', 'start', 'delete', 'load-more'])

const confirmId = ref(null)

// Reset the armed delete when the sheet closes, so reopening never shows a hot
// "Delete?" next to a row the user has forgotten about.
watch(() => props.open, (isOpen) => { if (!isOpen) confirmId.value = null })

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>