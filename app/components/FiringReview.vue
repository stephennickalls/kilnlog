<!-- app/components/FiringReview.vue -->
<!--
  Shown when an ENDED firing is selected. Read-only review summary + actions.
  `canRestart` is false when another firing is already active.
  G1 (°F): peakTemp arrives as raw °C, converted for the summary via useTempUnit.

  NOTES (Jul 2026): a Notes action sits with the other buttons. It emits only —
  app.vue owns the modal and the PUT (firings.notes already existed server-side).
  A trailing • on the label means this firing already has notes saved, so you can
  tell at a glance without opening the modal.

  ICONS (Aug 2026): emoji glyphs (🔥 ✨ 📝) replaced with inline SVGs — flame,
  bookmark, and file icons — matching the app's SVG-only icon language.

  RESPONSIVE FIX (Jul 2026): the action row used to switch to five full-width
  buttons at `sm` (640px). On an iPad in portrait — 768px wide, WITH the 280px
  sidebar showing — that leaves the card about 490px, so the shrink-0 button row
  ate everything and crushed the summary into a one-word-per-line column.
  Three tiers now:
    < 640px   ellipsis menu only            (phones)
    640–1279  primary button + ellipsis     (tablets, split-screen, small laptops)
    ≥ 1280px  full five-button row          (desktop with room to spare)
  FiringConsole already broke at `lg` for the same reason; this brings Review
  into line rather than inventing a new scheme.
-->
<template>
  <div class="bg-white border border-parchment-3 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex items-start sm:items-center gap-3 sm:gap-5" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">

    <!-- Summary -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-ink-faint">Finished firing</span>
        <span v-if="firing.auto_ended" class="text-[10px] px-1.5 py-0.5 rounded bg-parchment-2 text-ink-faint border border-parchment-3">auto-ended</span>
      </div>
      <p class="text-base sm:text-xl font-bold text-ink truncate mt-0.5">{{ firing.name }}</p>
      <p class="text-xs sm:text-sm text-ink-muted mt-0.5 truncate">{{ summary }}</p>
      <!-- CONE DROPS: witnessed drops, in order, with elapsed time + temp -->
      <p v-if="coneLine" class="text-xs sm:text-sm text-flame font-semibold mt-0.5 truncate" :title="coneLine">{{ coneLine }}</p>
    </div>

    <!-- ── Actions: full row (xl+ only — needs ~620px of its own) ───────────── -->
    <div class="hidden xl:flex gap-2 shrink-0">
      <button class="flex items-center justify-center gap-2 px-4 py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors whitespace-nowrap" @click="$emit('fire-again', firing)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-5.5-11C13 6 10 7 10 10c-1.5-1-2-2.5-2-4-2.5 2-4 5-4 8 0 4.4 3.6 8 8 8z"/></svg>
        Fire this again
      </button>
      <button class="flex items-center justify-center gap-2 px-4 py-2.5 border border-celadon/30 bg-celadon-bg text-celadon-dark hover:bg-celadon hover:text-parchment text-sm font-bold rounded-xl transition-colors whitespace-nowrap" @click="$emit('save-as-schedule', firing)">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        Save as schedule
      </button>
      <!-- Notes — parent owns the modal + PUT -->
      <button
        class="flex items-center justify-center gap-2 px-4 py-2.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
        :title="firing.notes ? 'View or edit notes' : 'Add notes'"
        @click="$emit('notes', firing)"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
        {{ firing.notes ? 'Notes •' : 'Notes' }}
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-2.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        :disabled="!canRestart"
        :title="canRestart ? '' : 'End the active firing first'"
        @click="$emit('restart', firing)"
      >
        ↺ Restart
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-2.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        :disabled="!hasData"
        :title="hasData ? 'Download this firing as CSV' : 'Nothing to export yet'"
        @click="$emit('export', firing)"
      >
        ↓ Export
      </button>
    </div>

    <!-- ── Actions: condensed (below xl) — primary + ellipsis ───────────────── -->
    <div class="xl:hidden flex items-center gap-2 shrink-0">

      <!-- Primary action stays visible from sm up; on phones it lives in the
           menu only, where vertical space is cheaper than horizontal. -->
      <button
        class="hidden sm:flex items-center justify-center gap-2 px-3.5 py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors whitespace-nowrap"
        @click="$emit('fire-again', firing)"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-5.5-11C13 6 10 7 10 10c-1.5-1-2-2.5-2-4-2.5 2-4 5-4 8 0 4.4 3.6 8 8 8z"/></svg>
        Fire again
      </button>

      <div class="relative">
        <button
          class="p-2 -mr-1 sm:mr-0 sm:border sm:border-parchment-3 sm:rounded-xl rounded-lg text-ink-muted hover:bg-parchment-2 transition-colors"
          title="Actions"
          @click="menuOpen = !menuOpen"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>

        <!-- Backdrop -->
        <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />

        <!-- Menu -->
        <div
          v-if="menuOpen"
          class="absolute right-0 top-full mt-1 z-50 w-52 bg-white border border-parchment-3 rounded-xl py-1.5 flex flex-col"
          style="box-shadow:0 8px 28px rgba(58,30,8,0.16)"
        >
          <!-- Duplicated on sm+ (the button beside the menu does the same job),
               but a menu missing its primary action reads as broken. -->
          <button class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-flame hover:bg-flame-bg text-left transition-colors" @click="pick('fire-again')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-5.5-11C13 6 10 7 10 10c-1.5-1-2-2.5-2-4-2.5 2-4 5-4 8 0 4.4 3.6 8 8 8z"/></svg>
            Fire this again
          </button>
          <button class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-celadon-dark hover:bg-celadon-bg text-left transition-colors" @click="pick('save-as-schedule')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            Save as schedule
          </button>
          <div class="my-1 border-t border-parchment-3" />
          <!-- Notes — parent owns the modal + PUT -->
          <button class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-parchment-2 text-left transition-colors" @click="pick('notes')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
            {{ firing.notes ? 'Notes •' : 'Notes' }}
          </button>
          <button
            class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-parchment-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canRestart"
            @click="pick('restart')"
          >
            ↺ Restart
          </button>
          <button
            class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-parchment-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!hasData"
            @click="pick('export')"
          >
            ↓ Export
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  firing:     { type: Object, required: true },
  canRestart: { type: Boolean, default: true },
  peakTemp:   { type: Number, default: null },   // raw °C
  duration:   { type: String, default: null },
})

const emit = defineEmits(['fire-again', 'save-as-schedule', 'restart', 'export', 'notes'])

const { displayTemp, unitLabel } = useTempUnit()

const menuOpen = ref(false)

function pick(event) {
  menuOpen.value = false
  emit(event, props.firing)
}

const hasData = computed(() =>
  !!(props.firing.readings?.length || props.firing.schedule?.length)
)

const summary = computed(() => {
  const parts = []
  if (props.peakTemp !== null) parts.push(`Peak ${displayTemp(props.peakTemp)}${unitLabel.value}`)
  if (props.duration)          parts.push(props.duration)
  const n = props.firing.readings?.length
  if (n) parts.push(`${n} reading${n === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'No readings logged'
})

// CONE DROPS: "▽ 04 at 6h 10m · ▽ 6 at 7h 32m (1214°C)"
const coneLine = computed(() => {
  const drops = props.firing.cone_drops
  if (!drops?.length || !props.firing.started_at) return ''
  return [...drops]
    .sort((a, b) => a.dropped_at - b.dropped_at)
    .map(d => {
      const mins = Math.max(0, Math.round((d.dropped_at - props.firing.started_at) / 60))
      const t = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
      const temp = (d.temp_at_drop !== null && d.temp_at_drop !== undefined)
        ? ` (${displayTemp(d.temp_at_drop)}${unitLabel.value})` : ''
      return `▽ ${d.cone} at ${t}${temp}`
    })
    .join(' · ')
})
</script>