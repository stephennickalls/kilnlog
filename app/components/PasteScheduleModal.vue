<!-- app/components/PasteScheduleModal.vue -->
<!--
  Paste a firing schedule from anywhere — a forum post, Glazy, a supplier blog,
  a studio handout, notes typed off a controller — and get a curve.

  There's no interchange format for firing schedules; the de facto one is prose
  steps ("80°F/hr to 250°F, hold 60"). useSchedulePaste reads those and returns
  °C points, so this component is mostly a preview: parse on every keystroke,
  show what we understood, let the user fix the text before committing.

  NOTHING SAVES FROM HERE. It emits @import with points/type/cone and the caller
  (schedules/new.vue, StartFiringModal) drops them into its own editor, where
  they're still fully editable. A paste that parses 90% right is a good outcome
  as long as the user can see the 10%.

  UNITS: the parser reads the PASTE's unit (usually °F — most schedules in
  circulation are American) and always hands back °C. The preview then displays
  in the user's own unit via useTempUnit, so the numbers on screen may not match
  the numbers pasted. That's correct, and the source-unit chip says so.
-->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 flex items-end sm:items-center justify-center z-[60] font-serif" style="background: rgba(26,18,8,0.6)" @click.self="$emit('close')">
      <div class="bg-parchment w-full sm:w-[560px] sm:rounded-2xl rounded-t-2xl sm:max-h-[88vh] max-h-[92vh] flex flex-col border border-parchment-3 overflow-hidden" style="box-shadow: 0 -8px 40px rgba(26,18,8,0.15)">

        <!-- Header -->
        <div class="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3.5 border-b border-parchment-3 shrink-0">
          <div class="min-w-0">
            <h2 class="text-base font-bold text-ink">Paste a schedule</h2>
            <p class="text-[11px] text-ink-muted mt-0.5 leading-snug">Copy the steps from anywhere — a forum, a blog, your kiln manual.</p>
          </div>
          <button class="p-1.5 -mr-1 rounded-lg hover:bg-parchment-2 text-ink-muted hover:text-ink transition-colors shrink-0" @click="$emit('close')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-3">

          <textarea
            v-model="text"
            rows="6"
            :placeholder="PASTE_EXAMPLE"
            class="w-full border border-parchment-3 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 resize-y"
            style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace"
          />

          <div class="flex flex-wrap items-center gap-2">
            <button v-if="canReadClipboard" class="px-3 py-1.5 rounded-full border border-parchment-3 bg-white text-xs font-semibold text-ink-muted hover:border-flame/50 hover:text-ink transition-colors" @click="pasteFromClipboard">
              Paste from clipboard
            </button>
            <button v-if="!text.trim()" class="px-3 py-1.5 rounded-full border border-parchment-3 bg-white text-xs font-semibold text-ink-muted hover:border-flame/50 hover:text-ink transition-colors" @click="text = PASTE_EXAMPLE">
              Try an example
            </button>
            <button v-if="text.trim()" class="px-3 py-1.5 rounded-full text-xs font-semibold text-ink-faint hover:text-ink transition-colors" @click="text = ''">
              Clear
            </button>
          </div>

          <!-- Warnings -->
          <div v-for="(w, i) in parsed.warnings" :key="'w'+i" class="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <svg class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
            <p class="text-[11px] text-amber-800 leading-snug">{{ w }}</p>
          </div>

          <p v-if="text.trim() && !parsed.segments.length" class="text-xs text-ink-muted px-1 py-3 text-center border border-dashed border-parchment-3 rounded-xl leading-relaxed">
            Couldn't find any steps in that. Each line needs a rate and a temperature — something like <span class="font-semibold text-ink">100°C/hr to 600°C</span>.
          </p>

          <!-- Preview -->
          <template v-if="parsed.segments.length">
            <div class="rounded-xl overflow-hidden border border-parchment-3" :style="{ background: theme.groundBg }">
              <ScheduleSparkline :points="parsed.points" :width="512" :height="120" :stroke="theme.stroke" :fill="theme.fill" class="w-full" style="height:120px" />
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="theme.badgeText" :style="{ background: theme.groundBg }">{{ labelForType(parsed.type) }}</span>
              <span v-if="parsed.cone" class="px-2 py-0.5 rounded-full text-[10px] font-bold text-ink-muted bg-parchment-2">Cone {{ parsed.cone }}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold text-ink-muted bg-parchment-2">Read as °{{ parsed.unit }}</span>
              <span class="ml-auto text-[11px] text-ink-faint tabular-nums">{{ parsed.segments.length }} steps · {{ formatMins(totalMins) }}</span>
            </div>

            <div class="rounded-xl border border-parchment-3 bg-white overflow-hidden">
              <div class="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 px-3 py-2 border-b border-parchment-3 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                <span>#</span><span>Rate {{ unitLabel }}/hr</span><span>To {{ unitLabel }}</span><span>Hold</span>
              </div>
              <div v-for="(s, i) in parsed.segments" :key="'s'+i" class="grid grid-cols-[28px_1fr_1fr_1fr] gap-2 px-3 py-2 text-[13px] text-ink tabular-nums" :class="i % 2 ? 'bg-parchment/40' : ''">
                <span class="text-ink-faint">{{ i + 1 }}</span>
                <span>{{ s.rate >= 9999 ? 'Full' : displayDelta(s.rate) }}</span>
                <span>{{ displayTemp(s.target) }}°</span>
                <span :class="s.hold ? '' : 'text-ink-faint'">{{ s.hold ? formatMins(s.hold) : '—' }}</span>
              </div>
            </div>

            <p class="text-[11px] text-ink-muted leading-snug px-1">
              Starts from {{ displayTemp(parsed.ambientC) }}{{ unitLabel }}. You can adjust everything after importing.
            </p>
          </template>

        </div>

        <!-- Footer -->
        <div class="px-5 sm:px-6 pb-5 pt-3.5 border-t border-parchment-3 shrink-0 bg-parchment">
          <button
            class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!parsed.segments.length"
            @click="doImport"
          >{{ parsed.segments.length ? `Import ${parsed.segments.length} step${parsed.segments.length === 1 ? '' : 's'}` : 'Import' }}</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/PasteScheduleModal.vue
import { parseSchedule, PASTE_EXAMPLE } from '~/composables/useSchedulePaste'
import { formatMins } from '~/composables/useCurveSegments'
import { themeForType, labelForType } from '~/composables/useScheduleTheme'

const props = defineProps({
  open: Boolean,
})
const emit = defineEmits(['close', 'import'])

// displayDelta is the RATE converter — ×9/5 with no +32. displayTemp is the
// absolute one. Using the wrong one here is invisible and wrong by 32 degrees.
const { displayTemp, displayDelta, unitLabel } = useTempUnit()

const text = ref('')

// Parsing is cheap (a few regexes over a handful of lines), so it runs on every
// keystroke — the preview updating live is what makes a bad paste fixable.
const parsed = computed(() => parseSchedule(text.value))

const theme     = computed(() => themeForType(parsed.value.type))
const totalMins = computed(() => {
  const pts = parsed.value.points
  return pts.length ? Math.max(...pts.map(p => p.offsetMinutes)) : 0
})

const canReadClipboard = computed(() => import.meta.client && !!navigator?.clipboard?.readText)

async function pasteFromClipboard() {
  try {
    const t = await navigator.clipboard.readText()
    if (t?.trim()) text.value = t
  } catch {
    // Permission denied or unsupported — the textarea still works.
  }
}

watch(() => props.open, (val) => { if (val) text.value = '' })

function doImport() {
  const p = parsed.value
  if (!p.segments.length) return
  emit('import', {
    points:   p.points,          // [{ offsetMinutes, targetTemp }] °C
    segments: p.segments,
    type:     p.type,
    cone:     p.cone,
    unit:     p.unit,
    ambientC: p.ambientC,
  })
}
</script>