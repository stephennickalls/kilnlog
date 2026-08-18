<!-- app/components/ConeDropSheet.vue -->
<!--
  One-tap logging of witness-cone drops on a live firing. The person is at a
  kiln, likely on a phone, possibly gloved: big chips, no typing, no dropdowns.

  The PACK comes first — those are the cones physically in the kiln, so they are
  the only ones that can drop. The full table stays available behind "Other
  cone" because kilns fire unevenly and someone will witness a cone they didn't
  plan; the plan must never block logging what actually happened.

  Same principle applies to reference-data gaps: a cone with no temp_c still
  appears (ordered by sort_order, shown without a rating) rather than silently
  vanishing from the picker.

  The next undropped pack cone is highlighted (cones drop in sequence). Dropped
  cones show ticked and disabled, with an undo row below. The sheet stays open
  across a run of taps.

  Emits only — the parent owns the API calls:
    log(coneName)   -> POST   /api/firings/:id/cones
    remove(dropId)  -> DELETE /api/cone-drops/:id
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[75] flex flex-col justify-end sm:justify-center sm:items-center font-serif"
      style="background:rgba(26,18,8,0.6)"
      @click.self="$emit('close')"
    >
      <div class="bg-parchment w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl flex flex-col border border-parchment-3" style="max-height:80vh; max-height:min(80vh, 80dvh); box-shadow:0 -8px 40px rgba(26,18,8,0.15)">

        <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
        <div class="flex items-center justify-between px-5 py-3 border-b border-parchment-3 shrink-0">
          <div class="min-w-0">
            <h2 class="text-base font-bold text-ink flex items-center gap-1.5">
              <svg class="w-4 h-4 text-celadon shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
              Cone down
            </h2>
            <p class="text-xs text-ink-muted mt-0.5">Tap the cone that just dropped</p>
          </div>
          <button class="p-2 -mr-1 text-ink-muted hover:text-ink shrink-0" aria-label="Close" @click="$emit('close')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-4">

          <!-- The pack: the cones actually in the kiln. -->
          <div v-if="packCones.length" class="flex flex-col gap-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint px-0.5">In your pack</p>
            <div class="grid grid-cols-3 min-[380px]:grid-cols-4 gap-2">
              <button
                v-for="c in packCones" :key="c.name"
                class="relative py-3.5 rounded-xl text-base font-bold tabular-nums border transition-colors disabled:cursor-default flex flex-col items-center gap-0.5"
                :class="chipClass(c.name)"
                :disabled="isDropped(c.name) || busy"
                @click="$emit('log', c.name)"
              >
                <span v-if="isDropped(c.name)" class="absolute top-1 right-1.5 text-[10px]">✓</span>
                {{ c.name }}
                <span v-if="c.tempC !== null" class="text-[10px] font-medium opacity-60">{{ displayTemp(c.tempC) }}°</span>
              </button>
            </div>
          </div>

          <!-- No pack planned: the full table is the only option, so show it. -->
          <p v-else class="text-[11px] text-ink-muted leading-snug px-0.5">
            No cone pack planned for this firing — plan one next time and these
            become the cones you tap.
          </p>

          <!-- Anything can drop; the plan is priority, never a gate. -->
          <div class="flex flex-col gap-2">
            <button
              v-if="packCones.length"
              class="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors py-1.5 self-start"
              @click="showAll = !showAll"
            >
              <svg class="w-3.5 h-3.5 transition-transform" :class="showAll ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              Other cone
            </button>

            <div v-if="showAll || !packCones.length" class="grid grid-cols-4 min-[380px]:grid-cols-5 gap-2">
              <button
                v-for="c in otherCones" :key="c.name"
                class="relative py-3 rounded-xl text-sm font-bold tabular-nums border transition-colors disabled:cursor-default"
                :class="chipClass(c.name)"
                :disabled="isDropped(c.name) || busy"
                @click="$emit('log', c.name)"
              >
                <span v-if="isDropped(c.name)" class="absolute top-1 right-1.5 text-[10px]">✓</span>
                {{ c.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Logged so far, with undo. -->
        <div v-if="drops.length" class="border-t border-parchment-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 overflow-y-auto" style="max-height:30%">
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-2">Logged this firing</p>
          <ul class="flex flex-col gap-1.5">
            <li v-for="d in sortedDrops" :key="d.id" class="flex items-center gap-2 text-sm">
              <span class="font-bold text-ink tabular-nums">▽ {{ d.cone }}</span>
              <span class="text-ink-muted text-xs flex-1 min-w-0 truncate">
                {{ elapsedLabel(d.dropped_at) }}<template v-if="d.temp_at_drop !== null && d.temp_at_drop !== undefined"> · {{ displayTemp(d.temp_at_drop) }}{{ unitLabel }}<template v-if="gapFor(d) !== null"> · {{ gapFor(d) }}</template></template>
              </span>
              <button class="p-1 text-parchment-4 hover:text-red-400 transition-colors shrink-0" title="Remove" :disabled="busy" @click="$emit('remove', d.id)">
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
// app/components/ConeDropSheet.vue
import { computed, ref } from 'vue'

const props = defineProps({
  open:      { type: Boolean, default: false },
  cones:     { type: Array, default: () => [] },   // [{ id, name, sort_order, temp_c }]
  pack:      { type: Array, default: () => [] },   // firing.cone_pack — names
  drops:     { type: Array, default: () => [] },   // firing.cone_drops
  startedAt: { type: Number, default: 0 },
  busy:      { type: Boolean, default: false },
})

defineEmits(['close', 'log', 'remove'])

const { displayTemp, unitLabel } = useTempUnit()

const showAll = ref(false)

// Cold to hot. Cones without a rating still appear (ordered by sort_order and
// shown without a temperature) — a gap in reference data must never stop
// someone logging what they actually witnessed.
const byTemp = computed(() =>
  [...props.cones]
    .map((c, i) => ({
      name: c.name,
      tempC: Number.isFinite(Number(c.temp_c)) ? Number(c.temp_c) : null,
      order: Number.isFinite(Number(c.sort_order)) ? Number(c.sort_order) : i,
    }))
    .sort((a, b) => {
      if (a.tempC !== null && b.tempC !== null) return a.tempC - b.tempC
      return a.order - b.order
    })
)

const packSet    = computed(() => new Set(props.pack ?? []))
const packCones  = computed(() => byTemp.value.filter(c => packSet.value.has(c.name)))
const otherCones = computed(() => byTemp.value.filter(c => !packSet.value.has(c.name)))

const droppedNames = computed(() => new Set(props.drops.map(d => d.cone)))
const isDropped = (name) => droppedNames.value.has(name)

const sortedDrops = computed(() =>
  [...props.drops].sort((a, b) => a.dropped_at - b.dropped_at)
)

// Cones drop in sequence, so the likely next tap is the coldest pack cone that
// hasn't gone yet. Falls back to the full list when there's no pack.
const nextExpected = computed(() => {
  const pool = packCones.value.length ? packCones.value : byTemp.value
  return pool.find(c => !isDropped(c.name))?.name ?? null
})

function chipClass(name) {
  if (isDropped(name)) return 'bg-celadon-bg text-celadon-dark border-celadon/30 opacity-70'
  if (name === nextExpected.value) return 'bg-flame text-parchment border-flame'
  return 'bg-white text-ink border-parchment-3 active:bg-parchment-2'
}

function elapsedLabel(ts) {
  if (!props.startedAt || !ts) return ''
  const mins = Math.max(Math.round((ts - props.startedAt) / 60), 0)
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// The gap between where a cone actually fell and its rating is the kiln's
// calibration emerging. Shown per drop; the chart draws the same thing.
function gapFor(d) {
  const ref = byTemp.value.find(c => c.name === d.cone)
  if (!ref || ref.tempC === null || d.temp_at_drop == null) return null
  const gap = Math.round(d.temp_at_drop - ref.tempC)
  if (Math.abs(gap) < 2) return 'on rating'
  return `${gap > 0 ? '+' : ''}${gap}° vs rating`
}
</script>