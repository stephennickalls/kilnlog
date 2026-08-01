<!-- app/components/ConeDropSheet.vue -->
<!--
  CONE DROPS (Aug 2026): one-tap logging of witness-cone drops on a live firing.
  Opened from FiringConsole's overflow menu. Bottom sheet on all sizes — the
  person is standing at a kiln, likely on a phone, possibly gloved: big chips,
  no typing, no dropdowns.

  The next cone after the most recently dropped one is highlighted as the
  likely candidate (cones drop in sequence). Already-dropped cones show ticked
  and disabled, with an undo row below.

  Emits only — the parent owns the API calls:
    log(coneName)   → POST  /api/firings/:id/cones
    remove(dropId)  → DELETE /api/cone-drops/:id
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[75] flex flex-col justify-end sm:justify-center sm:items-center font-serif"
      style="background:rgba(26,18,8,0.6)"
      @click.self="$emit('close')"
    >
      <div class="bg-parchment w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl flex flex-col border border-parchment-3" style="max-height:80vh; box-shadow:0 -8px 40px rgba(26,18,8,0.15)">

        <!-- Grab handle + header -->
        <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
        <div class="flex items-center justify-between px-5 py-3 border-b border-parchment-3 shrink-0">
          <div>
            <h2 class="text-base font-bold text-ink">🔻 Cone down</h2>
            <p class="text-xs text-ink-muted mt-0.5">Tap the cone that just dropped</p>
          </div>
          <button class="p-1.5 text-ink-muted hover:text-ink" @click="$emit('close')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Cone chips -->
        <div class="overflow-y-auto px-4 py-4 grid grid-cols-4 gap-2">
          <button
            v-for="c in cones"
            :key="c.id"
            class="relative py-3 rounded-xl text-base font-bold tabular-nums border transition-colors disabled:cursor-default"
            :class="chipClass(c.name)"
            :disabled="isDropped(c.name) || busy"
            @click="$emit('log', c.name)"
          >
            <span v-if="isDropped(c.name)" class="absolute top-1 right-1.5 text-[10px]">✓</span>
            {{ c.name }}
          </button>
        </div>

        <!-- Already logged, with undo -->
        <div v-if="drops.length" class="border-t border-parchment-3 px-5 py-3 shrink-0 overflow-y-auto" style="max-height:30%">
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-2">Logged this firing</p>
          <ul class="flex flex-col gap-1.5">
            <li v-for="d in sortedDrops" :key="d.id" class="flex items-center gap-2 text-sm">
              <span class="font-bold text-ink tabular-nums">▽ {{ d.cone }}</span>
              <span class="text-ink-muted text-xs flex-1">
                {{ elapsedLabel(d.dropped_at) }}<template v-if="d.temp_at_drop !== null && d.temp_at_drop !== undefined"> · {{ displayTemp(d.temp_at_drop) }}{{ unitLabel }}</template>
              </span>
              <button class="p-1 text-parchment-4 hover:text-red-400 transition-colors" title="Remove" :disabled="busy" @click="$emit('remove', d.id)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
            </li>
          </ul>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open:      { type: Boolean, default: false },
  cones:     { type: Array, default: () => [] },   // [{ id, name, sort_order }]
  drops:     { type: Array, default: () => [] },   // firing.cone_drops
  startedAt: { type: Number, default: 0 },
  busy:      { type: Boolean, default: false },
})

defineEmits(['close', 'log', 'remove'])

const { displayTemp, unitLabel } = useTempUnit()

const droppedNames = computed(() => new Set(props.drops.map(d => d.cone)))
const isDropped = (name) => droppedNames.value.has(name)

const sortedDrops = computed(() =>
  [...props.drops].sort((a, b) => a.dropped_at - b.dropped_at)
)

// The likely next cone: the one after the hottest already-dropped cone
// (cones drop in sequence as heat-work accumulates).
const suggestedName = computed(() => {
  if (!props.cones.length) return null
  if (!props.drops.length) return null
  let maxIdx = -1
  for (const d of props.drops) {
    const i = props.cones.findIndex(c => c.name === d.cone)
    if (i > maxIdx) maxIdx = i
  }
  return props.cones[maxIdx + 1]?.name ?? null
})

function chipClass(name) {
  if (isDropped(name)) return 'bg-parchment-2 border-parchment-3 text-ink-faint'
  if (name === suggestedName.value) return 'bg-flame text-parchment border-flame hover:bg-flame-dark'
  return 'bg-white border-parchment-3 text-ink hover:bg-flame-bg hover:border-flame/40'
}

function elapsedLabel(unix) {
  if (!props.startedAt) return ''
  const mins = Math.max(0, Math.round((unix - props.startedAt) / 60))
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
}
</script>