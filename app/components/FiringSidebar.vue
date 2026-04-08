<template>
  <!-- Open sidebar -->
  <aside
    v-if="open"
    class="shrink-0 bg-parchment border-r border-parchment-3 flex flex-col relative select-none font-serif"
    :style="{ width: width + 'px' }"
  >
    <div class="px-4 py-3 border-b border-parchment-3 flex items-center justify-between">
      <h2 class="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Firings</h2>
      <button class="p-1 rounded-md hover:bg-parchment-2 transition-colors text-ink-faint hover:text-ink" @click="$emit('toggle')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <path d="M13 8l-3 4 3 4"/>
        </svg>
      </button>
    </div>

    <ul class="flex-1 overflow-y-auto divide-y divide-parchment-3">
      <!-- Active firing -->
      <li v-if="activeFiring">
        <button
          class="w-full flex flex-col px-4 py-3 text-left transition-colors"
          :class="selectedId === activeFiring.id ? 'bg-flame-bg border-l-2 border-flame' : 'hover:bg-parchment-2'"
          @click="$emit('select', activeFiring)"
        >
          <span class="text-sm font-semibold text-ink truncate">{{ activeFiring.name }}</span>
          <span class="flex items-center gap-1 text-xs text-green-600 mt-0.5 font-semibold">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Live
          </span>
        </button>
      </li>

      <li v-if="!pastFirings.length && !activeFiring" class="px-4 py-4 text-xs text-ink-faint">
        No firings yet
      </li>

      <li v-for="f in pastFirings" :key="f.id" class="group relative">
        <button
          class="w-full flex flex-col px-4 py-3 text-left transition-colors pr-10"
          :class="selectedId === f.id ? 'bg-flame-bg border-l-2 border-flame' : 'hover:bg-parchment-2'"
          @click="$emit('select', f)"
        >
          <span class="text-sm font-medium text-ink truncate">{{ f.name }}</span>
          <span class="text-xs text-ink-faint mt-0.5">{{ formatDate(f.created_at) }}</span>
        </button>

        <button
          v-if="confirmDeleteId !== f.id"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-parchment-4 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
          @click.stop="confirmDeleteId = f.id"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>

        <button
          v-else
          class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
          @click.stop="confirmDelete(f)"
        >Delete?</button>
      </li>
    </ul>

    <div class="p-3 border-t border-parchment-3">
      <button class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors" @click="$emit('start')">
        + Start firing
      </button>
    </div>

    <!-- Drag handle -->
    <div class="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-flame/30 transition-colors z-10" @mousedown="$emit('drag', $event)">
      <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <div class="flex flex-col gap-0.5">
          <div class="w-0.5 h-1 bg-ink-faint rounded-full"></div>
          <div class="w-0.5 h-1 bg-ink-faint rounded-full"></div>
          <div class="w-0.5 h-1 bg-ink-faint rounded-full"></div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Collapsed rail -->
  <div v-else class="shrink-0 w-10 bg-parchment border-r border-parchment-3 flex flex-col items-center py-3">
    <button class="p-1 rounded-md hover:bg-parchment-2 transition-colors text-ink-faint hover:text-ink" @click="$emit('toggle')">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <path d="M11 8l3 4-3 4"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  open:         Boolean,
  width:        Number,
  selectedId:   { type: Number, default: null },
  activeFiring: { type: Object, default: null },
  pastFirings:  { type: Array, default: () => [] },
})

const confirmDeleteId = ref(null)

function confirmDelete(f) {
  confirmDeleteId.value = null
  emit('delete', f)
}

watch(() => props.pastFirings, () => { confirmDeleteId.value = null })

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const emit = defineEmits(['toggle', 'select', 'start', 'drag', 'delete'])
</script>