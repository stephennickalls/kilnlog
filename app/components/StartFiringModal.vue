<!-- app/components/StartFiringModal.vue -->
<!--
  TWO-STEP WIZARD. External contract: props { open, library, pastFirings,
  preselect }, emits @create { name, notes, schedulePoints, reductions,
  conePack, saveToLibrary }.

  Step 1 "pick"    — a mini schedule library. Starter cards, then Your
                     schedules / Presets / Past firings behind collapsed
                     expanders, then "Build a new plan" last.
  Step 2 "confirm" — plan chip (+ Change), auto-filled name, then Adjust curve
                     and Notes collapsed.

  New-user path: Start firing → Bisque → Start firing. Three taps, no typing.
  `preselect` (from /schedules "Use") skips straight to step 2.

  ORDER OF STEP 1 (Aug 2026): "Build a new plan" sits at the BOTTOM. It used to
  sit directly under the starters, where it read as a third equally-weighted
  choice and pulled new users into an authoring task before they had seen a
  single curve. It is the escape hatch for someone who has looked at every
  saved and preset schedule and found nothing — so it comes after those lists,
  not before them.

  PRESETS GROUP BY BODY (Sep 2026). They used to group by `type`, which was
  fine at six presets and useless at twenty: fifteen of them are type='glaze',
  so the whole list arrived as one undifferentiated heap. The rule now lives in
  useScheduleSections — bisque and raku by type, everything else by clay body —
  because /schedules groups the same rows and two copies of that rule would
  drift within a week. Sections are individually collapsible and ALL CLOSED on
  open: an expander that reveals twenty rows is the same wall of text the
  grouping exists to prevent, so the sections themselves have to be the thing
  you toggle.

  STARTERS COME FROM THE DB (Aug 2026). The two big cards used to be
  BISQUE_POINTS / GLAZE_POINTS declared right here — a second source of curves
  alongside schedule_library, free to drift from it, and carrying a 2h
  cool-down that no kiln can do. Now they are library rows with
  `starter_rank` set (see migrations/20260819_starter_schedules.sql), so a
  starter is editable, duplicable and inspectable like any other schedule, and
  there is exactly ONE place curves live. Nothing is hardcoded as a fallback on
  purpose: if the library fails to load there is no curve to show, and quietly
  substituting a fake one is worse than showing the presets list.

  BUILDING a curve is NOT in this modal: it routes to /schedules/new instead.
  Authoring is a task, not a tap — the sheet caps at 88dvh, which leaves no room
  to drag points on a phone, and a curve drawn here used to evaporate unless the
  user happened to tick "save to library". The editor makes saving the default.

  CONE PACK: the witness cones planned for this firing travel with the plan —
  chosen when the kiln is loaded, not mid-firing. Copied from the chosen
  schedule; ConePackEditor lives in the Adjust-curve expander.

  SCROLL: the scroll pane is `flex-1 min-h-0 overflow-y-auto` and its CONTENT
  is a plain block (space-y-*), NOT a flex column. A flex-col scroll pane lets
  its children shrink to fit instead of overflowing, which crushed the curve
  editor and Notes card to slivers and meant nothing ever scrolled.

  COLOUR: sparklines and the curve editor use themeForType (useScheduleTheme),
  same as ScheduleCard, so the modal parses the same way the schedules page
  does. ScheduleSparkline is reused rather than re-implemented.
-->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 flex items-end sm:items-center justify-center z-50 font-serif" style="background: rgba(26,18,8,0.6)" @click.self="$emit('close')">
      <!-- dvh: the vh cap measures a viewport that includes Safari's chrome on
           iOS, so the sticky footer button could sit below the fold. -->
      <div class="bg-parchment w-full sm:w-[560px] sm:rounded-2xl rounded-t-2xl flex flex-col border border-parchment-3 overflow-hidden" style="max-height:92vh; max-height:min(92vh, 88dvh); box-shadow: 0 -8px 40px rgba(26,18,8,0.15)">

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

          <!-- Starters (schedule_library rows with starter_rank set).
               Side by side they get ~134px each at 320px, which smears the
               sparkline, so they stack below 380px. -->
          <div v-if="starters.length" class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
            <button
              v-for="s in starters" :key="s.token"
              class="flex flex-col gap-2 p-3 rounded-xl border border-parchment-3 bg-white text-left transition-colors hover:border-flame/50"
              style="box-shadow:0 1px 3px rgba(58,30,8,0.04)"
              @click="pick(s.token)"
            >
              <div class="rounded-lg overflow-hidden" :style="{ background: themeForType(s.type).groundBg }">
                <ScheduleSparkline :points="s.points" :reductions="s.reductions" :width="240" :height="52" :stroke="themeForType(s.type).stroke" :fill="themeForType(s.type).fill" class="w-full" style="height:52px" />
              </div>
              <span class="text-sm font-bold text-ink">{{ s.name }}</span>
              <span class="text-[11px] text-ink-muted leading-snug">{{ s.sub }}</span>
            </button>
          </div>

          <!-- Library still in flight. Placeholders, not a fake curve. -->
          <div v-else-if="!library.length" class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
            <div v-for="n in 2" :key="'sk'+n" class="h-[136px] rounded-xl border border-parchment-3 bg-white/60 animate-pulse" />
          </div>

          <!-- Your schedules (collapsed). NOT sectioned: a user with three
               saved plans knows what each one is, and sections would add a tap
               to reach them. This only groups the presets, where the count is
               the problem. -->
          <section v-if="myLibrary.length" class="space-y-1.5">
            <button class="w-full flex items-center justify-between px-1 py-1.5 text-left" @click="showMine = !showMine">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Your schedules ({{ myLibrary.length }})</span>
              <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showMine ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <template v-if="showMine">
              <ScheduleRow v-for="lib in myLibrary" :key="'my'+lib.id" :schedule="lib" @pick="pick('lib:' + lib.id)" />
            </template>
          </section>

          <!-- Presets, grouped by what you are firing. Starters are excluded —
               they are already the two cards above, and listing them twice
               reads as clutter. -->
          <section v-if="presetLibrary.length" class="space-y-1.5">
            <button class="w-full flex items-center justify-between px-1 py-1.5 text-left" @click="showPresets = !showPresets">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Preset schedules ({{ presetLibrary.length }})</span>
              <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showPresets ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <template v-if="showPresets">
              <div v-for="sec in presetSections" :key="'sec' + sec.key" class="space-y-1.5">
                <!-- Section headers are BUTTONS with a border, not the bare
                     uppercase labels used one level up. Two collapsible tiers
                     that look identical is a maze; this tier reads as a row you
                     press, which is what it is. -->
                <button
                  class="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border border-parchment-3 text-left hover:border-parchment-4 transition-colors"
                  @click="toggleSection(sec.key)"
                >
                  <span class="text-xs font-bold text-ink">{{ sec.label }} <span class="text-ink-faint font-normal">({{ sec.schedules.length }})</span></span>
                  <svg class="w-3.5 h-3.5 text-ink-faint transition-transform" :class="openSections.has(sec.key) ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <template v-if="openSections.has(sec.key)">
                  <ScheduleRow v-for="lib in sec.schedules" :key="'pr'+lib.id" :schedule="lib" @pick="pick('lib:' + lib.id)" />
                </template>
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

          <!-- LAST. Authoring a curve is a task, not a tap: it leaves for the
               full editor, where there is room and where saving is the default.
               The hairline marks it as the end of the list rather than another
               item in it. -->
          <div class="pt-1 border-t border-parchment-3">
            <button class="w-full flex items-center gap-3 px-3.5 py-2.5 mt-3 rounded-xl border border-dashed border-parchment-4 hover:border-flame/50 transition-colors text-left" @click="goToEditor">
              <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-ink">Build a new plan</span>
                <span class="block text-[11px] text-ink-muted">Opens the schedule editor, then starts firing</span>
              </span>
              <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 17L17 7M7 7h10v10"/></svg>
            </button>
          </div>

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
                <span class="block text-[11px] text-ink-muted">{{ form.schedulePoints.length ? planSummary(form.schedulePoints) : 'No curve on this plan' }}</span>
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
                class="input rounded-xl px-4 py-2.5 focus:border-flame focus:ring-flame/10"
                @input="onNameInput($event.target.value)"
              >
            </div>

            <!-- Adjust curve (collapsed) -->
            <div class="rounded-xl border border-parchment-3 bg-white overflow-hidden">
              <button class="w-full flex items-center justify-between px-3.5 py-3 text-left" @click="showAdvanced = !showAdvanced">
                <span class="text-sm font-semibold text-ink">
                  Adjust curve<span v-if="reductions.length" class="text-ink-muted font-normal"> · {{ reductions.length }} reduction{{ reductions.length === 1 ? '' : 's' }}</span><span v-if="conePack.length" class="text-ink-muted font-normal"> · {{ conePack.length }} cones</span>
                </span>
                <svg class="w-4 h-4 text-ink-faint transition-transform" :class="showAdvanced ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div v-if="showAdvanced" class="px-3.5 pb-4 pt-3 space-y-3 border-t border-parchment-3">
                <div class="flex items-center justify-between">
                  <TempUnitToggle />
                  <button class="flex items-center gap-1.5 text-xs font-semibold text-cobalt-dark hover:text-cobalt transition-colors" @click="showReductionPlanner = true">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    {{ reductions.length ? `Edit reduction (${reductions.length})` : 'Add reduction' }}
                  </button>
                </div>
                <ScheduleCurveEditor v-model="form.schedulePoints" :reductions="reductions" :stroke="theme.stroke" :fill="theme.fill" />
                <div class="pt-1 border-t border-parchment-3">
                  <ConePackEditor v-model="conePack" :target-cone="targetCone" />
                </div>
                <label class="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input type="checkbox" :checked="saveToLibrary" class="mt-0.5 accent-flame" @change="saveToLibrary = $event.target.checked">
                  <span class="text-xs text-ink-muted leading-snug"><span class="font-semibold text-ink">Save this plan to my library</span> — reuse it (and its reductions and cone pack) next time.</span>
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
                <textarea v-model="form.notes" rows="2" placeholder="Clay body, glazes, weather..." class="input rounded-xl px-4 py-2.5 !bg-parchment resize-none focus:border-flame focus:ring-flame/10" />
              </div>
            </div>

            <p v-if="loadingPast" class="text-xs text-ink-muted text-center">Loading firing plan…</p>
          </div>

          <!-- Footer -->
          <div class="px-5 sm:px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-parchment-3 shrink-0 bg-parchment">
            <button
              class="w-full py-3 min-h-[44px] bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!form.name.trim() || loadingPast"
              @click="submit"
            >Start firing →</button>
          </div>
        </template>

      </div>
    </div>

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
import { themeForType } from '~/composables/useScheduleTheme'

const props = defineProps({
  open:        Boolean,
  library:     { type: Array, default: () => [] },  // built-ins + own (/api/schedules)
  pastFirings: { type: Array, default: () => [] },  // user's finished firings
  preselect:   { type: Object, default: null },     // { name?, schedulePoints, reductions?, conePack?, cone? }
})

const emit = defineEmits(['close', 'create'])

const router = useRouter()

const { sectionsFor } = useScheduleSections()

// ── State ─────────────────────────────────────────────────────────────────────
const step                 = ref('pick')            // 'pick' | 'confirm'
const startFrom            = ref('')                // '' | 'lib:N' | 'past:N' | 'preselect'
const pickedType           = ref('bisque')          // drives themeForType
const loadingPast          = ref(false)
const nameAutoFilled       = ref(true)
const reductions           = ref([])                // [{ startTemp, endTemp|null, kind }] °C
const saveToLibrary        = ref(false)
const showReductionPlanner = ref(false)
const showMine             = ref(false)
const showPresets          = ref(false)
const showPast             = ref(false)
const showAdvanced         = ref(false)
const showNotes            = ref(false)

// Which preset sections are expanded. A Set replaced wholesale on every toggle
// rather than mutated in place, because Vue does not track Set membership
// changes.
const openSections = ref(new Set())
function toggleSection(key) {
  const next = new Set(openSections.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  openSections.value = next
}

// The witness cones planned for this firing, copied from the chosen schedule.
// targetCone drives ConePackEditor's guide/target/guard suggestion.
const conePack   = ref([])
const targetCone = ref('')

const form = reactive({
  name:           '',
  notes:          '',
  schedulePoints: [],
})

const theme = computed(() => themeForType(pickedType.value))

// db points → editor shape
function normPoints(points) {
  return (points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
}

// ── Source groupings ──────────────────────────────────────────────────────────
// A starter is just a built-in with starter_rank set (migration
// 20260819_starter_schedules.sql). Rank ascending is the card order.
const starters = computed(() =>
  props.library
    .filter(l => l.user_id === null && l.starter_rank != null)
    .sort((a, b) => a.starter_rank - b.starter_rank)
    .map(l => ({
      token:      `lib:${l.id}`,
      type:       l.type ?? 'other',
      name:       l.name,
      // The card's second line is editorial copy, so it comes from the row.
      // planSummary is the fallback, never nothing.
      sub:        l.description || planSummary(normPoints(l.points)),
      points:     normPoints(l.points),
      reductions: l.reductions ?? [],
    }))
)

const myLibrary      = computed(() => props.library.filter(l => l.user_id !== null))
const presetLibrary  = computed(() => props.library.filter(l => l.user_id === null && l.starter_rank == null))
const presetSections = computed(() => sectionsFor(presetLibrary.value))

// No starters flagged (fresh db, or the flag was cleared) — open the presets
// list so step 1 is never a dead end. Deliberately NOT a hardcoded curve.
watch([starters, () => props.library], () => {
  if (props.library.length && !starters.value.length) showPresets.value = true
})

// Matches the schedules-page card meta: "999°C peak · 13h"
function planSummary(pts) {
  if (!pts?.length) return ''
  const mins = Math.max(...pts.map(p => p.offsetMinutes))
  const h = Math.floor(mins / 60), m = mins % 60
  const peak = Math.max(...pts.map(p => p.targetTemp))
  return `${peak}°C peak · ${h}h${m ? ` ${m}m` : ''}`
}

// ── Row: one library schedule, themed by its own type ─────────────────────────
// Inline so the list markup isn't repeated three times.
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
  if (props.preselect) return props.preselect.name || 'Loaded plan'
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

// Leaves the modal entirely. ?then=fire makes the editor's save go straight to
// starting the firing rather than dropping the user on the schedule page.
function goToEditor() {
  emit('close')
  router.push('/schedules/new?then=fire')
}

// ── Pick (step 1 → step 2) ────────────────────────────────────────────────────
// Starters land here as plain `lib:` tokens — there is no separate branch for
// them, which is the point of moving them into the library.
async function pick(token) {
  startFrom.value = token
  if (nameAutoFilled.value) form.name = suggestedName(token)

  if (token.startsWith('lib:')) {
    const lib = props.library.find(l => String(l.id) === token.slice(4))
    if (lib) {
      form.schedulePoints = normPoints(lib.points)
      reductions.value    = (lib.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind }))
      conePack.value      = [...(lib.cone_pack ?? [])]
      targetCone.value    = lib.cone ?? ''
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
      reductions.value    = (data.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind }))
      conePack.value      = [...(data.cone_pack ?? [])]
      targetCone.value    = ''
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
  showMine.value             = false
  showPresets.value          = false
  showPast.value             = false
  showAdvanced.value         = false
  showNotes.value            = false
  openSections.value         = new Set()
  form.notes                 = ''

  if (props.preselect) {
    form.name            = props.preselect.name ?? ''
    form.schedulePoints  = (props.preselect.schedulePoints ?? []).map(p => ({ ...p }))
    reductions.value     = (props.preselect.reductions ?? []).map(r => ({ ...r }))
    conePack.value       = [...(props.preselect.conePack ?? [])]
    targetCone.value     = props.preselect.cone ?? ''
    pickedType.value     = props.preselect.type ?? guessType(props.preselect.name)
    startFrom.value      = 'preselect'
    nameAutoFilled.value = false
    step.value           = 'confirm'
  } else {
    startFrom.value     = ''
    pickedType.value    = 'bisque'
    form.schedulePoints = []
    reductions.value    = []
    conePack.value      = []
    targetCone.value    = ''
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
    conePack:       conePack.value,
    saveToLibrary:  saveToLibrary.value,
  })
}
</script>