<template>
  <!-- Open sidebar -->
  <aside
    v-if="open"
    class="shrink-0 bg-white border-r border-stone-200 flex flex-col relative select-none"
    :style="{ width: width + 'px' }"
  >
    <div class="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-stone-400">Firings</h2>
      <button
        class="p-1 rounded-md hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
        @click="$emit('toggle')"
        title="Close sidebar"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <path d="M13 8l-3 4 3 4"/>
        </svg>
      </button>
    </div>

    <ul class="flex-1 overflow-y-auto divide-y divide-stone-100">
      <li v-if="activeFiring">
        <button
          class="w-full flex flex-col px-4 py-3 text-left transition-colors"
          :class="selectedId === activeFiring.id ? 'bg-orange-50 border-l-2 border-orange-400' : 'hover:bg-stone-50'"
          @click="$emit('select', activeFiring)"
        >
          <span class="text-sm font-medium text-stone-700 truncate">{{ activeFiring.name }}</span>
          <span class="text-xs text-green-600 mt-0.5 font-medium">● Live</span>
        </button>
      </li>
      <li v-if="!pastFirings.length && !activeFiring" class="px-4 py-3 text-sm text-stone-400">
        No firings yet
      </li>
      <li v-for="f in pastFirings" :key="f.id">
        <button
          class="w-full flex flex-col px-4 py-3 text-left transition-colors"
          :class="selectedId === f.id ? 'bg-orange-50 border-l-2 border-orange-400' : 'hover:bg-stone-50'"
          @click="$emit('select', f)"
        >
          <span class="text-sm font-medium text-stone-700 truncate">{{ f.name }}</span>
          <span class="text-xs text-stone-400 mt-0.5">{{ formatDate(f.created_at) }}</span>
        </button>
      </li>
    </ul>

    <div class="p-3 border-t border-stone-100">
      <button class="btn-primary w-full" @click="$emit('start')">Start Firing</button>
    </div>

    <!-- Drag handle -->
    <div
      class="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-orange-300 transition-colors group z-10"
      @mousedown="$emit('drag', $event)"
    >
      <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="flex flex-col gap-0.5">
          <div class="w-0.5 h-1 bg-stone-400 rounded-full"></div>
          <div class="w-0.5 h-1 bg-stone-400 rounded-full"></div>
          <div class="w-0.5 h-1 bg-stone-400 rounded-full"></div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Collapsed rail -->
  <div
    v-else
    class="shrink-0 w-10 bg-white border-r border-stone-200 flex flex-col items-center py-3"
  >
    <button
      class="p-1 rounded-md hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
      @click="$emit('toggle')"
      title="Open sidebar"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <path d="M11 8l3 4-3 4"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open:         boolean
  width:        number
  selectedId:   number | null
  activeFiring: any
  pastFirings:  any[]
}>()

defineEmits<{
  toggle: []
  select: [firing: any]
  start:  []
  drag:   [event: MouseEvent]
}>()

function formatDate(unix: number) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>