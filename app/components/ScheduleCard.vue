<!-- app/components/ScheduleCard.vue -->
<!--
  A schedule read as a curve off a kiln chart. The sparkline is the hero on a
  faint chart-ground; colour follows the firing TYPE (bisque warm, glaze/single
  celadon, raku cobalt) via useScheduleTheme — so the library parses by colour-
  temperature at a glance. Actions recede: whole-card tap = Edit; one Start
  footer; Duplicate/Delete in a ⋯ menu on hover/focus.
-->
<template>
  <div
    class="group relative flex flex-col bg-white border border-parchment-3 rounded-xl overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
    :class="hoverBorder"
    style="box-shadow:0 1px 3px rgba(58,30,8,0.04)"
    tabindex="0"
    @click="$emit('edit')"
    @keydown.enter="$emit('edit')"
  >
    <!-- Curve hero on a type-tinted chart-ground -->
    <div class="relative px-3 pt-3 pb-1">
      <div class="rounded-lg overflow-hidden" :style="groundStyle">
        <ScheduleSparkline
          :points="points"
          :width="280"
          :height="72"
          :stroke="theme.stroke"
          :fill="theme.fill"
          class="w-full"
          style="height:72px"
        />
      </div>

      <!-- Source mark: explicit tiny sizing so nothing inherits a large font -->
      <span
        class="absolute top-4 left-5 inline-flex items-center gap-1 font-bold uppercase leading-none"
        style="font-size:9px;letter-spacing:0.06em"
        :class="theme.badgeText"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="theme.badgeDot" />{{ badgeLabel }}
      </span>

      <!-- ⋯ overflow menu -->
      <div class="absolute top-3 right-3" @click.stop>
        <button
          class="w-7 h-7 flex items-center justify-center rounded-lg text-ink-faint bg-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-ink"
          :class="{ 'opacity-100': menuOpen }"
          aria-label="More actions"
          @click="menuOpen = !menuOpen"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
        </button>
        <div v-if="menuOpen" class="absolute right-0 top-full mt-1 w-40 z-20 bg-white border border-parchment-3 rounded-lg p-1 flex flex-col gap-0.5" style="box-shadow:0 4px 16px rgba(58,30,8,0.12)">
          <button class="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold text-ink hover:bg-parchment-2 text-left transition-colors" @click="act('duplicate')">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
            Duplicate
          </button>
          <button v-if="!isPreset" class="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold text-red-500 hover:bg-red-50 text-left transition-colors" @click="confirmingDelete = true; menuOpen = false">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Name + meta -->
    <div class="px-3 pb-2.5 pt-1 flex flex-col gap-0.5 flex-1">
      <p class="text-sm font-bold text-ink leading-snug truncate">{{ schedule.name }}</p>
      <p class="text-[11px] text-ink-muted tabular-nums">
        {{ peakTemp }}° peak
        <span class="text-parchment-4 mx-0.5">·</span>{{ durationLabel }}
        <template v-if="schedule.cone"><span class="text-parchment-4 mx-0.5">·</span>Cone {{ schedule.cone }}</template>
      </p>
    </div>

    <!-- Primary action footer -->
    <div class="px-2 pb-2" @click.stop>
      <button
        class="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-colors"
        :class="theme.startBtn"
        @click="$emit('start')"
      >
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z"/></svg>
        Start firing
      </button>
    </div>

    <!-- Delete confirm overlay -->
    <div v-if="confirmingDelete" class="absolute inset-0 z-30 bg-parchment/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center" @click.stop>
      <p class="text-sm font-semibold text-ink">Delete “{{ schedule.name }}”?</p>
      <div class="flex gap-2">
        <button class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors" @click="act('confirm-delete')">Delete</button>
        <button class="px-3 py-1.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-xs font-semibold rounded-lg transition-colors" @click="confirmingDelete = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { themeForType } from '~/composables/useScheduleTheme'

const props = defineProps({
  schedule: { type: Object,  required: true },
  isPreset: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'start', 'duplicate', 'confirm-delete'])

const menuOpen        = ref(false)
const confirmingDelete = ref(false)

function act(name) {
  menuOpen.value = false
  if (name === 'confirm-delete') confirmingDelete.value = false
  emit(name)
}

// ── Theme by firing type ──────────────────────────────────────────────────────
const theme = computed(() => themeForType(props.schedule.type))

const groundStyle = computed(() => ({
  height: '72px',
  background:
    `linear-gradient(to right, ${theme.value.gridRGBA} 1px, transparent 1px) 0 0 / 25% 100%,` +
    `linear-gradient(to bottom, ${theme.value.gridRGBA} 1px, transparent 1px) 0 0 / 100% 33.33%,` +
    theme.value.groundBg,
}))

const hoverBorder = computed(() => {
  switch (theme.value.variant) {
    case 'celadon': return 'hover:border-celadon/40'
    case 'cobalt':  return 'hover:border-cobalt/40'
    default:        return 'hover:border-flame/30'
  }
})

// ── Points / meta ─────────────────────────────────────────────────────────────
const points = computed(() => {
  const raw = props.schedule.points ?? props.schedule.schedule_library_points ?? []
  return raw.map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
})

const peakTemp = computed(() =>
  points.value.length ? Math.round(Math.max(...points.value.map(p => p.targetTemp))) : 0
)

const durationLabel = computed(() => {
  if (!points.value.length) return '—'
  const maxMin = Math.max(...points.value.map(p => p.offsetMinutes))
  const h = Math.floor(maxMin / 60), m = maxMin % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
})

// Badge label: source-based (Preset / From firing / Custom).
const badgeLabel = computed(() => {
  if (props.isPreset || props.schedule.user_id === null) return 'Preset'
  if (props.schedule.source === 'from_firing') return 'From firing'
  return 'Custom'
})
</script>