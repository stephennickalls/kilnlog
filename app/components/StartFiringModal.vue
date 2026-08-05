<!-- app/components/StartFiringModal.vue -->
<!--
  TWO-STEP WIZARD (Aug 2026 redesign). External contract unchanged:
  props { open, library, pastFirings, preselect }, emits @create
  { name, notes, schedulePoints, reductions, saveToLibrary }. app.vue untouched.

  Step 1 "pick"    — a mini schedule library. Bisque/Glaze starter cards, a
                     blank-curve row, then Your schedules / Presets / Past
                     firings behind collapsed expanders.
  Step 2 "confirm" — plan chip (+ Change), auto-filled name, then Adjust curve
                     and Notes collapsed. Blank auto-opens the editor.

  PASTE (Aug 2026): step 1 also accepts a schedule pasted from a forum post,
  blog, or kiln manual — see useSchedulePaste. It lands like any other pick but
  opens the curve editor, because imported numbers deserve a look first.

  New-user path: Start firing → Bisque → Start firing. Three taps, no typing.
  `preselect` (D1/D2, from /schedules "Use") skips straight to step 2.

  SCROLL (fix): the scroll pane is `flex-1 min-h-0 overflow-y-auto` and its
  CONTENT is a plain block (space-y-*), NOT a flex column. A flex-col scroll
  pane lets its children flex-shrink to fit instead of overflowing, which
  silently crushed the curve editor and the Notes card to slivers and meant
  nothing ever scrolled.

  COLOUR: sparklines and the curve editor use themeForType (useScheduleTheme),
  same as ScheduleCard — bisque warm, glaze/single celadon, raku cobalt — so
  the modal parses the same way the schedules page does. ScheduleSparkline is
  reused rather than re-implemented, so reduction bands render here too.
-->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 flex items-end sm:items-center justify-center z-50 font-serif" style="background: rgba(26,18,8,0.6)" @click.self="$emit('close')">
      <div class="bg-parchment w-full sm:w-[560px] sm:rounded-2xl rounded-t-2xl sm:max-h-[88vh] max-h-[92vh] flex flex-col border border-parchment-3 overflow-hidden" style="box-shadow: 0 -8px 40px rgba(26,18,8,0.15)">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3.5 border-b border-parchment-3 shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <button v-if="step === 'confirm' && !preselect" class="p-1 -ml-1 rounded-lg hover:bg-parchment-2 text-ink-muted" @click="step = 'pick'">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 class="text-base font-bold text-ink truncate">
              {{ step === 'pick' ? 'What are you firing?' : 'Start firing' }}
            </h2>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-parchment-2 text-ink-muted hover:text-ink transition-colors" @click="$emit('close')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- ════ STEP 1 — PICK A PLAN ════════════════════════════════════════ -->
        <div v-if="step === 'pick'" class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-4">

          <!-- Starters: the two obvious choices -->
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="s in starters" :key="s.token"
              class="flex flex-col gap-2 p-3 rounded-xl border border-parchment-3 bg-white text-left transition-colors hover:border-flame/50"
              style="box-shadow:0 1px 3px rgba(58,30,8,0.04)"
              @click="pick(s.token)"
            >
              <div class="rounded-lg overflow-hidden" :style="{ background: themeForType(s.type).groundBg }">
                <ScheduleSparkline :points="s.points" :width="240" :height="52" :stroke="themeForType(s.type).stroke" :fill="themeForType(s.type).fill" class="w-full" style="height:52px" />
              </div>
              <span class="text-sm font-bold text-ink">{{ s.label }}</span>
              <span class="text-[11px] text-ink-muted leading-snug">{{ s.sub }}</span>
            </button>
          </div>

          <!-- Blank — up top, but quiet -->
          <button class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-dashed border-parchment-4 hover:border-flame/50 transition-colors text-left" @click="pick('blank')">
            <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-semibold text-ink">Blank curve</span>
              <span class="block text-[11px] text-ink-muted">Draw your own plan from scratch</span>
            </span>
            <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <!-- Paste — the format schedules actually travel in -->
          <!-- <button class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-dashed border-parchment-4 hover:border-flame/50 transition-colors text-left" @click="showPaste = true">
            <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
            </svg>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-semibold text-ink">Paste a schedule</span>
              <span class="block text-[11px] text-ink-muted">From a forum post, blog, or kiln manual</span>
            </span>
            <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button> -->

          <!-- Your schedules (collapsed) -->
          <section v-if="myLibrary.length" class="space-y-1.5">
            <button class="w-full flex items-center justify-between px-1 py-1.5 text-left" @click="showMine = !showMine">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Your schedules ({{ myLibrary.length }})</span>
              <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showMine ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <template v-if="showMine">
              <ScheduleRow v-for="lib in myLibrary" :key="'my'+lib.id" :schedule="lib" @pick="pick('lib:' + lib.id)" />
            </template>
          </section>

          <!-- Presets (collapsed) -->
          <section class="space-y-1.5">
            <button class="w-full flex items-center justify-between px-1 py-1.5 text-left" @click="showPresets = !showPresets">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Preset schedules ({{ presetLibrary.length }})</span>
              <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showPresets ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <template v-if="showPresets">
              <div v-for="type in presetTypes" :key="'pt'+type" class="space-y-1.5">
                <p class="text-[11px] font-semibold text-ink-muted px-1 pt-1">{{ labelForType(type) }}</p>
                <ScheduleRow v-for="lib in presetsOfType(type)" :key="'pr'+lib.id" :schedule="lib" @pick="pick('lib:' + lib.id)" />
              </div>
            </template>
          </section>

          <!-- Past firings (collapsed) -->
          <section v-if="pastFirings.length" class="space-y-1.5">
            <button class="w-full flex items-center justify-between px-1 py-1.5 text-left" @click="showPast = !showPast">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Repeat a past firing ({{ pastFirings.length }})</span>
              <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showPast ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <template v-if="showPast">
              <button
                v-for="f in pastFirings" :key="'pf'+f.id"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-parchment-3 bg-white hover:border-celadon/50 transition-colors text-left"
                @click="pick('past:' + f.id)"
              >
                <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-semibold text-ink truncate">{{ f.name }}</span>
                  <span class="block text-[11px] text-ink-muted">{{ formatDate(f.created_at) }}</span>
                </span>
                <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </template>
          </section>

        </div>

        <!-- ════ STEP 2 — CONFIRM ════════════════════════════════════════════ -->
        <template v-else>
          <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-4">

            <!-- Plan summary chip -->
            <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border" :style="{ borderColor: theme.stroke + '40', background: theme.groundBg }">
              <ScheduleSparkline
                v-if="form.schedulePoints.length"
                :points="form.schedulePoints" :reductions="reductions"
                :width="72" :height="32"
                :stroke="theme.stroke" :fill="theme.fill"
                class="shrink-0" style="width:72px;height:32px"
              />
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-ink truncate">{{ planLabel }}</span>
                <span class="block text-[11px] text-ink-muted">{{ form.schedulePoints.length ? planSummary(form.schedulePoints) : 'Blank — draw your curve below' }}</span>
              </span>
              <button v-if="!preselect" class="text-xs font-semibold shrink-0 hover:underline" :style="{ color: theme.stroke }" @click="step = 'pick'">Change</button>
            </div>

            <!-- Name -->
            <div class="space-y-1.5">
              <label class="block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
              <input
                :value="form.name"
                type="text"
                placeholder="e.g. Cone 10 reduction"
                class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
                @input="onNameInput($event.target.value)"
              >
            </div>

            <!-- Adjust curve (collapsed; auto-open for blank) -->
            <div class="rounded-xl border border-parchment-3 bg-white overflow-hidden">
              <button class="w-full flex items-center justify-between px-3.5 py-3 text-left" @click="showAdvanced = !showAdvanced">
                <span class="text-sm font-semibold text-ink">
                  Adjust curve<span v-if="reductions.length" class="text-ink-muted font-normal"> · {{ reductions.length }} reduction{{ reductions.length === 1 ? '' : 's' }}</span>
                </span>
                <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showAdvanced ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div v-if="showAdvanced" class="px-3.5 pb-4 pt-3 space-y-3 border-t border-parchment-3">
                <div class="flex items-center justify-between">
                  <TempUnitToggle />
                  <button class="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors" @click="showReductionPlanner = true">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    {{ reductions.length ? `Edit reduction (${reductions.length})` : 'Add reduction' }}
                  </button>
                </div>
                <ScheduleCurveEditor v-model="form.schedulePoints" :reductions="reductions" :stroke="theme.stroke" :fill="theme.fill" />
                <label class="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input type="checkbox" :checked="saveToLibrary" class="mt-0.5 accent-flame" @change="saveToLibrary = $event.target.checked">
                  <span class="text-xs text-ink-muted leading-snug"><span class="font-semibold text-ink">Save this plan to my library</span> — reuse it (and its reductions) next time.</span>
                </label>
              </div>
            </div>

            <!-- Notes (collapsed) -->
            <div class="rounded-xl border border-parchment-3 bg-white overflow-hidden">
              <button class="w-full flex items-center justify-between px-3.5 py-3 text-left" @click="showNotes = !showNotes">
                <span class="text-sm font-semibold text-ink">Notes <span class="text-ink-muted font-normal">(optional)</span></span>
                <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showNotes ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div v-if="showNotes" class="px-3.5 pb-3.5 pt-3 border-t border-parchment-3">
                <textarea v-model="form.notes" rows="2" placeholder="Clay body, glazes, weather..." class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-parchment focus:outline-none focus:border-flame font-serif resize-none" />
              </div>
            </div>

            <p v-if="loadingPast" class="text-xs text-ink-muted text-center">Loading firing plan…</p>
          </div>

          <!-- Footer -->
          <div class="px-5 sm:px-6 pb-5 pt-3.5 border-t border-parchment-3 shrink-0 bg-parchment">
            <button
              class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!form.name.trim() || loadingPast"
              @click="submit"
            >Start firing →</button>
          </div>
        </template>

      </div>
    </div>

    <!-- Paste import. z-[60] sits above this modal's z-50 so both stay open. -->
    <PasteScheduleModal :open="showPaste" @close="showPaste = false" @import="onPasteImport" />

    <!-- Reduction planner -->
    <ReductionPlannerModal
      :open="showReductionPlanner"
      :reductions="reductions"
      @close="showReductionPlanner = false"
      @save="onReductionsSaved"
    />
  </Teleport>
</template>

<script setup>
// app/components/StartFiringModal.vue
import { h } from 'vue'
import { themeForType, labelForType } from '~/composables/useScheduleTheme'

const props = defineProps({
  open:        Boolean,
  library:     { type: Array, default: () => [] },  // built-ins + own (/api/schedules)
  pastFirings: { type: Array, default: () => [] },  // user's finished firings
  preselect:   { type: Object, default: null },     // { name?, schedulePoints, reductions? }
})

const emit = defineEmits(['close', 'create'])

const BISQUE_POINTS = [
  { offsetMinutes: 0,   targetTemp: 20   },
  { offsetMinutes: 60,  targetTemp: 120  },
  { offsetMinutes: 180, targetTemp: 600  },
  { offsetMinutes: 300, targetTemp: 1000 },
  { offsetMinutes: 360, targetTemp: 1000 },
  { offsetMinutes: 480, targetTemp: 80   },
]
const GLAZE_POINTS = [
  { offsetMinutes: 0,   targetTemp: 20   },
  { offsetMinutes: 60,  targetTemp: 200  },
  { offsetMinutes: 180, targetTemp: 600  },
  { offsetMinutes: 360, targetTemp: 1280 },
  { offsetMinutes: 480, targetTemp: 1280 },
  { offsetMinutes: 600, targetTemp: 100  },
]

// ── State ─────────────────────────────────────────────────────────────────────
const step                 = ref('pick')            // 'pick' | 'confirm'
const startFrom            = ref('starter:bisque')
const pickedType           = ref('bisque')          // drives themeForType
const loadingPast          = ref(false)
const nameAutoFilled       = ref(true)
const reductions           = ref([])                // [{ startTemp, endTemp|null }] °C
const saveToLibrary        = ref(false)
const showReductionPlanner = ref(false)
const showPaste            = ref(false)
const showMine             = ref(false)
const showPresets          = ref(false)
const showPast             = ref(false)
const showAdvanced         = ref(false)
const showNotes            = ref(false)

const form = reactive({
  name:           '',
  notes:          '',
  schedulePoints: [],
})

const theme = computed(() => themeForType(pickedType.value))

const starters = [
  { token: 'starter:bisque', type: 'bisque', label: 'Bisque firing', sub: 'First fire of raw clay · ~8h to 1000°C', points: BISQUE_POINTS },
  { token: 'starter:glaze',  type: 'glaze',  label: 'Glaze firing',  sub: 'Glaze fire · ~10h to 1280°C',           points: GLAZE_POINTS },
]

// ── Source groupings ──────────────────────────────────────────────────────────
const myLibrary     = computed(() => props.library.filter(l => l.user_id !== null))
const presetLibrary = computed(() => props.library.filter(l => l.user_id === null))
const presetTypes   = computed(() => [...new Set(presetLibrary.value.map(l => l.type))].sort())
function presetsOfType(type) { return presetLibrary.value.filter(l => l.type === type) }

// db points → editor shape
function normPoints(points) {
  return (points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
}

// Matches the schedules-page card meta: "999°C peak · 13h"
function planSummary(pts) {
  if (!pts?.length) return ''
  const mins = Math.max(...pts.map(p => p.offsetMinutes))
  const h = Math.floor(mins / 60), m = mins % 60
  const peak = Math.max(...pts.map(p => p.targetTemp))
  return `${peak}°C peak · ${h}h${m ? ` ${m}m` : ''}`
}

// ── Row: one library schedule, themed by its own type ─────────────────────────
// Inline so the list markup isn't repeated three times. Renders ScheduleSparkline
// exactly as ScheduleCard does, at thumbnail size.
const ScheduleRow = (p, { emit: e }) => {
  const s  = p.schedule
  const th = themeForType(s.type)
  const pts = normPoints(s.points)
  const meta = `${planSummary(pts)}${s.cone ? ` · Cone ${s.cone}` : ''}`
  return h('button', {
    class: 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-parchment-3 bg-white hover:border-parchment-4 transition-colors text-left',
    onClick: () => e('pick'),
  }, [
    h('span', { class: 'shrink-0 rounded-md overflow-hidden', style: { background: th.groundBg, width: '64px', height: '32px' } },
      h(resolveComponent('ScheduleSparkline'), {
        points: pts,
        reductions: s.reductions ?? [],
        width: 64, height: 32,
        stroke: th.stroke, fill: th.fill,
      })),
    h('span', { class: 'flex-1 min-w-0' }, [
      h('span', { class: 'block text-sm font-semibold text-ink truncate' }, s.name),
      h('span', { class: 'block text-[11px] text-ink-muted' }, meta),
    ]),
    h('svg', { class: 'w-4 h-4 text-ink-faint shrink-0', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, viewBox: '0 0 24 24' },
      h('path', { d: 'M9 18l6-6-6-6' })),
  ])
}
ScheduleRow.props = ['schedule']
ScheduleRow.emits = ['pick']

const planLabel = computed(() => {
  if (props.preselect)                       return props.preselect.name || 'Loaded plan'
  if (startFrom.value === 'blank')           return 'Blank curve'
  if (startFrom.value === 'starter:bisque')  return 'Bisque starter'
  if (startFrom.value === 'starter:glaze')   return 'Glaze starter'
  if (startFrom.value === 'paste')           return 'Pasted schedule'
  if (startFrom.value.startsWith('lib:')) {
    return props.library.find(l => String(l.id) === startFrom.value.slice(4))?.name ?? 'Schedule'
  }
  if (startFrom.value.startsWith('past:')) {
    return props.pastFirings.find(f => String(f.id) === startFrom.value.slice(5))?.name ?? 'Past firing'
  }
  return 'Plan'
})

// ── Name helpers ──────────────────────────────────────────────────────────────
function todayShort() {
  return new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}
function suggestedName(token) {
  if (token === 'starter:bisque') return `Bisque firing — ${todayShort()}`
  if (token === 'starter:glaze')  return `Glaze firing — ${todayShort()}`
  if (token === 'blank')          return `Firing — ${todayShort()}`
  if (token.startsWith('lib:')) {
    const lib = props.library.find(l => String(l.id) === token.slice(4))
    return lib ? `${lib.name} — ${todayShort()}` : ''
  }
  if (token.startsWith('past:')) {
    const f = props.pastFirings.find(x => String(x.id) === token.slice(5))
    return f ? `${f.name} — ${todayShort()}` : ''
  }
  return ''
}
function onNameInput(val) {
  form.name = val
  nameAutoFilled.value = false
}

// Past firings carry no type column — infer from the name, same rule as
// schedules/new.vue's guessType, so colour stays consistent across the app.
function guessType(name) {
  const n = (name ?? '').toLowerCase()
  if (n.includes('bisque') || n.includes('biscuit')) return 'bisque'
  if (n.includes('raku')) return 'raku'
  return 'glaze'
}

// ── Reductions from planner ───────────────────────────────────────────────────
function onReductionsSaved(list) {
  reductions.value = list
  showReductionPlanner.value = false
}

// ── Paste import ──────────────────────────────────────────────────────────────
// A pasted plan behaves like any other pick: fill the curve, jump to confirm.
// It also force-opens "Adjust curve" — the user has just imported SOMEONE
// ELSE'S numbers and should eyeball them (and the unit) before firing.
// Pasted text carries no reductions, so those clear.
function onPasteImport(result) {
  form.schedulePoints = result.points.map(p => ({ ...p }))
  reductions.value    = []
  pickedType.value    = result.type ?? 'other'
  startFrom.value     = 'paste'
  if (nameAutoFilled.value) {
    form.name = `${labelForType(result.type)}${result.cone ? ` cone ${result.cone}` : ''} — ${todayShort()}`
  }
  showPaste.value    = false
  showAdvanced.value = true
  step.value         = 'confirm'
}

// ── Pick (step 1 → step 2) ────────────────────────────────────────────────────
async function pick(token) {
  startFrom.value = token
  if (nameAutoFilled.value) form.name = suggestedName(token)

  if (token === 'blank') {
    form.schedulePoints = []
    reductions.value    = []
    pickedType.value    = 'other'
    showAdvanced.value  = true         // blank is meaningless without the editor
  } else if (token === 'starter:bisque') {
    form.schedulePoints = BISQUE_POINTS.map(p => ({ ...p }))
    reductions.value    = []
    pickedType.value    = 'bisque'
  } else if (token === 'starter:glaze') {
    form.schedulePoints = GLAZE_POINTS.map(p => ({ ...p }))
    reductions.value    = []
    pickedType.value    = 'glaze'
  } else if (token.startsWith('lib:')) {
    const lib = props.library.find(l => String(l.id) === token.slice(4))
    if (lib) {
      form.schedulePoints = normPoints(lib.points)
      reductions.value    = (lib.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null }))
      pickedType.value    = lib.type ?? 'other'
    }
  } else if (token.startsWith('past:')) {
    const f = props.pastFirings.find(x => String(x.id) === token.slice(5))
    pickedType.value  = guessType(f?.name)
    step.value        = 'confirm'      // move immediately; show loading state
    loadingPast.value = true
    try {
      const data = await $fetch(`/api/firings/${token.slice(5)}`)
      form.schedulePoints = normPoints(data.schedule)
      reductions.value    = (data.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null }))
    } catch {
      form.schedulePoints = []
    } finally {
      loadingPast.value = false
    }
    return
  }
  step.value = 'confirm'
}

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

// ── Open: reset; preselect skips to confirm ───────────────────────────────────
watch(() => props.open, (val) => {
  if (!val) return
  loadingPast.value          = false
  nameAutoFilled.value       = true
  saveToLibrary.value        = false
  showReductionPlanner.value = false
  showPaste.value            = false
  showMine.value             = false
  showPresets.value          = false
  showPast.value             = false
  showAdvanced.value         = false
  showNotes.value            = false
  form.notes                 = ''

  if (props.preselect) {
    form.name            = props.preselect.name ?? ''
    form.schedulePoints  = (props.preselect.schedulePoints ?? []).map(p => ({ ...p }))
    reductions.value     = (props.preselect.reductions ?? []).map(r => ({ ...r }))
    pickedType.value     = props.preselect.type ?? guessType(props.preselect.name)
    startFrom.value      = 'preselect'
    nameAutoFilled.value = false
    step.value           = 'confirm'
  } else {
    startFrom.value     = 'starter:bisque'
    pickedType.value    = 'bisque'
    form.schedulePoints = []
    reductions.value    = []
    form.name           = ''
    step.value          = 'pick'
  }
})

function submit() {
  if (!form.name.trim()) return
  emit('create', {
    name:           form.name,
    notes:          form.notes,
    schedulePoints: form.schedulePoints,
    reductions:     reductions.value,
    saveToLibrary:  saveToLibrary.value,
  })
}
</script>