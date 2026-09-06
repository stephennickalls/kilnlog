<!-- File: app/pages/schedules/[id].vue -->
<!--
  Editing a SAVED schedule. Sibling of schedules/new.vue, but no longer a twin:
  the two now differ deliberately on what a cone change does. See below.

  MOBILE: text-sm controls swapped for the shared .input, because any control
  under 16px makes iOS Safari zoom the page in on focus and never zoom back
  out. The curve header uses two wrapping groups rather than a flex-1 spacer,
  which forced label + badge + unit toggle + reduction button onto one line.

  CONE CHANGES RETARGET THE PEAK (Sep 2026). This page used to run useAutoCurve
  and raise CurveRebuildBar — "Replace this curve with a standard Glaze · cone 6
  curve? Your current points will be lost." Two things were wrong with it.

  It fired on LOAD. adoptCurve() guards the form assignments with a skip flag
  cleared on nextTick, and the cones fetch resolving mid-load was enough to slip
  past it, so opening your own saved schedule greeted you with an offer to
  delete it.

  And the offer was the wrong operation anyway. Change cone 6 to cone 10 and
  what you want is YOUR curve, hotter. Rebuild meant "discard your curve, insert
  a generic one" — every dragged point gone, every tuned hold gone — behind a
  label that sounded like the first thing. It needed a confirmation because it
  was destructive; the right operation needs none because it destroys nothing.

  So changing the cone now moves the peak and leaves the shape alone, silently.
  See retargetPeak below for what moves and what does not. Changing the TYPE
  does nothing to the curve at all — type is a label and a colour, and a bisque
  relabelled as a glaze is still the same curve somebody drew.

  /schedules/new keeps useAutoCurve and full regeneration, which is right there:
  those points are machine-made and nobody minds them being replaced.

  COPY ON SAVE, NOT ON OPEN (Sep 2026). This page used to fork a preset the
  moment it loaded: open a built-in to LOOK at it and a copy was already in
  "Your schedules" before the curve had drawn. Twenty looks, twenty copies,
  none of them asked for. Opening a page is not an intent to own it.

  Now a preset opens exactly as it is. Every control works, every edit is
  local, and nothing is written until Save. Save on a preset creates the copy
  (with whatever edits were made) and moves to it; Save on your own schedule
  updates it. The button says which it is going to do. If the name was left as
  the preset's, the copy gets today's date appended so the two can be told
  apart in a list - a copy that later has its cone retargeted would make
  "(copy)" a lie, and a date matches how firings are named everywhere else.

  CLAY BODY (Sep 2026). `body` files the schedule into a section on /schedules
  and in the Start firing modal. It sits on its own row, not in the type+cone
  grid, because those two are a pair that drive the curve while body is
  independent metadata. It rides along on the copy for the same reason the
  cone pack and reductions do: a copy of the porcelain preset that lost its
  body would file itself under "Any body" and the user would never know why.

  LANDSCAPE (Sep 2026). The whole print job is A4 landscape, set by the @page
  rule at the foot of this file. The tester wanted the curve bigger, and width
  is the axis that matters for a time series: 270mm of content instead of
  190mm. Both pages turn, not just this one - per-page orientation needs CSS
  named pages, which is recent Chrome and Safari only and does nothing at all
  in older browsers rather than failing loudly. One rule works everywhere, and
  the log sheet is better landscape anyway.

  PAGE ONE IS THE CURVE AND NOTHING ELSE (Sep 2026). The tester wants to plot
  readings onto the printed sheet by hand, so the chart gets the whole page and
  a two-level grid to write on.

  NO PROGRAM TABLE ON THE PRINT (Sep 2026). It was on page one, then briefly on
  the log sheet, and it is now on neither. Rate / target / hold / elapsed is
  what you key into a CONTROLLER, and nobody programs a kiln from a sheet of
  paper while standing at it - they do it beforehand, from the screen. On the
  printed page every one of those numbers is already in the curve, drawn
  against the axis you are plotting on, so the table was 25mm of paper
  restating the picture above it in a form nobody was going to read. That 25mm
  is now log rows.

  THE LOG HEADER IS ON PAGE ONE (Sep 2026). The course's fields - Date,
  Weather and ambient, Kiln, Load, Clay type, Work fired, Firing - sit in a
  single row between the title and the curve, prefilled where the schedule
  knows the answer and a rule to write on where it does not. They were on the
  log sheet for a day and it was the wrong page: the person writing "Kiln" and
  "Weather" is looking at the plan, and the log sheet is for numbers.

  Atmosphere prose was dropped with the table. The reduction is already ON the
  curve as a striped band with its own label, so a sentence saying the same
  thing under it was a second copy. The cone pack stayed, as one field in the
  row, because it is not in the curve and it is the one thing you read off
  this sheet mid-firing.

  PRINTING (Sep 2026). Requested by a ceramics student: attach the ramps and
  the graph to coursework, and take a sheet out to the kiln to write readings
  on. The print output is a SEPARATE DOCUMENT, not this page restyled:

    PAGE 1  header, curve with real axes, the step table, cone pack,
            atmosphere plan, description
    PAGE 2  45 blank log rows (PrintLogSheet)

  Both trees live in the DOM at all times — .print-only is display:none until
  the print media query flips it. Building the print tree behind v-if would
  give the printer nothing, since a media query does not trigger Vue reactivity
  and there is no event to hook before the dialog opens.

  It prints the SAVED state, not unsaved edits, and says so above the button.
  A printout that silently disagreed with the database would be worse than no
  printout at all — this sheet exists to be handed to a tutor.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <!-- ════════════════════ SCREEN ════════════════════ -->
    <div class="no-print">

      <AppNav
        :crumbs="[
          { label: 'Schedules', to: '/schedules' },
          { label: form.name || 'Edit schedule' },
        ]"
        container="max-w-2xl"
      >
        <template #lead>
          <!-- Phones get a back chevron instead of the full crumb trail. -->
          <NuxtLink
            to="/schedules"
            class="lg:hidden p-2 -ml-1 rounded-lg text-ink-muted active:bg-parchment-2 transition-colors shrink-0"
            aria-label="All schedules"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </NuxtLink>
        </template>
      </AppNav>

      <div v-if="loading" class="flex justify-center items-center py-24 text-ink-muted">
        <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
        </svg>
      </div>

      <main v-else class="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-safe flex flex-col gap-5 min-w-0">

        <!-- Name -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Cone 10 reduction"
            class="input rounded-xl px-4 py-2.5 focus:border-flame focus:ring-flame/10"
          />
        </div>

        <!-- Type + Cone -->
        <!-- Side by side at 320px leaves ~140px each, which truncates every cone
             label; stacked below 380px. -->
        <div class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
          <FiringTypeSelect v-model="form.type" />
          <ConeSelect v-model="form.cone" />
        </div>

        <!-- Own row: see the header note. -->
        <ClayBodySelect v-model="form.body" />

        <!-- Confirmation that the cone change did something, and exactly what.
             A silent edit to the curve is only acceptable if the user can see
             it happened; this line and the moving graph together are that.
             It clears itself after a few seconds — it is a receipt, not a
             status. -->
        <p v-if="retargetNote" class="-mt-3 px-1 text-[11px] text-celadon-dark font-semibold">
          {{ retargetNote }}
        </p>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Description <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
          <textarea
            v-model="form.description"
            rows="2"
            maxlength="500"
            placeholder="Notes about this schedule — when to use it, glaze pairings, quirks…"
            class="input rounded-xl px-4 py-2.5 resize-none focus:border-flame focus:ring-flame/10"
          />
        </div>

        <!-- Curve -->
        <div class="flex flex-col gap-2">
          <!-- Two groups with justify-between, so the row wraps instead of
               running off the screen. -->
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div class="flex items-center gap-2 min-w-0">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Curve</label>
              <span v-if="form.type" class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" :class="theme.badgeText">{{ form.type }}</span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <!-- The Steps table asks for a RATE (°C/hr vs °F/hr), so someone
                   editing a schedule written in Fahrenheit needs to flip back and
                   check against their source without leaving the page. -->
              <TempUnitToggle />
              <button
                class="flex items-center gap-1.5 py-1 text-xs font-semibold text-cobalt-dark hover:text-cobalt transition-colors"
                @click="showReductionPlanner = true"
              >
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                <!-- Short label on phones: "Edit reduction (3)" is the widest
                     string in this row. -->
                <span class="min-[380px]:hidden">{{ editReductions.length ? `Reduction (${editReductions.length})` : 'Reduction' }}</span>
                <span class="hidden min-[380px]:inline">{{ editReductions.length ? `Edit reduction (${editReductions.length})` : 'Add reduction' }}</span>
              </button>
            </div>
          </div>

          <ScheduleCurveEditor
            :model-value="editPoints"
            :reductions="editReductions"
            :stroke="theme.stroke"
            :fill="theme.fill"
            @update:model-value="onCurveEdit"
          />
          <div class="pt-3 border-t border-parchment-3">
            <ConePackEditor v-model="editConePack" :target-cone="form.cone" />
          </div>
        </div>

        <!-- Preset notice. Only on a built-in, and only above the buttons,
             where the decision it explains is about to be made. -->
        <p v-if="isPreset" class="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-celadon-bg/60 border border-celadon/30 text-xs text-celadon-dark leading-snug">
          <svg class="w-4 h-4 shrink-0 mt-px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
          <span>This is a built-in preset. Nothing is changed until you save, and saving makes your own copy under Your schedules.</span>
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-parchment-3">
          <button
            class="flex-1 min-h-[44px] py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
            :disabled="saving || !form.name.trim()"
            @click="save"
          >{{ saving ? 'Saving…' : (isPreset ? 'Save as my copy' : 'Save schedule') }}</button>
          <button
            class="flex-1 min-h-[44px] py-2.5 border border-celadon/40 bg-celadon-bg/60 text-celadon-dark hover:bg-celadon-bg text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
            :disabled="saving || !form.name.trim()"
            @click="saveAndStart"
          >{{ isPreset ? 'Copy & start firing →' : 'Save & start firing →' }}</button>
        </div>

        <!-- Print. Below the save row and quieter than both, because it is a
             side errand rather than a step in the flow. The warning only shows
             when it is true — a permanent "remember to save" line becomes
             invisible within a week. -->
        <div class="flex flex-col gap-1.5">
          <button
            class="w-full min-h-[44px] py-2.5 border border-parchment-3 bg-white text-ink-muted hover:bg-parchment-2 hover:text-ink text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            @click="printPlan"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>
            </svg>
            Print plan &amp; log sheet
          </button>
          <p class="text-[11px] text-ink-muted px-1 leading-snug">
            Two landscape pages: the curve on gridded paper you can plot on by hand, then 45 blank rows to log against.
            <span v-if="dirty" class="text-amber-600 font-semibold">Save first — printing uses the last saved version.</span>
          </p>
        </div>

      </main>
    </div>

    <!-- ════════════════════ PRINT ════════════════════ -->
    <!-- Always in the DOM, hidden by .print-only until the print media query
         reveals it. Reads `saved`, never `form`. -->
    <div v-if="saved" class="print-only" style="color:#000">

      <!-- ── Page 1 header ── -->
      <!-- Budget: A4 landscape is 186mm inside 12mm margins. Header 16, the
           description 6, the fields row 11, the curve 132. Anything added here
           comes out of the curve, which is the only thing on the page that
           benefits from being big. -->
      <div class="flex items-end justify-between border-b-2 border-black pb-1 mb-1.5">
        <div class="min-w-0">
          <p class="text-[7pt] uppercase tracking-[0.18em] leading-none">Firing plan</p>
          <p class="text-[14pt] font-bold leading-tight">{{ saved.name }}</p>
          <p class="text-[9pt] leading-tight">{{ printMeta }}</p>
        </div>
        <div class="text-right shrink-0 text-[7.5pt] leading-tight">
          <p class="font-bold text-[9pt]">KilnMonitor</p>
          <p>kilnlog.netlify.app · printed {{ printedOn }}</p>
        </div>
      </div>

      <p v-if="saved.description" class="text-[9pt] mb-1.5 leading-snug">{{ saved.description }}</p>

      <!-- ── Log header, the course's fields in the course's order ──
           One row across the width. Prefilled where the schedule knows; a rule
           to write on where only the person at the kiln does. Clay type is a
           RULE when the schedule is untagged - "Any body" is a filing label,
           not something you write on a kiln log. -->
      <div class="grid grid-cols-8 gap-x-3 mb-2">
        <div v-for="f in printFields" :key="f.label">
          <p class="text-[6.5pt] font-bold uppercase tracking-wider leading-none mb-0.5 whitespace-nowrap">{{ f.label }}</p>
          <p v-if="f.value" class="text-[8.5pt] leading-tight border-b border-black/30" style="min-height:5.5mm">{{ f.value }}</p>
          <div v-else class="border-b border-black/40" style="height:5.5mm" />
        </div>
      </div>

      <!-- ── Curve. Fixed height, so a long Program table cannot squeeze it;
           the strip below goes two columns instead. ── -->
      <div class="print-avoid-break">
        <PrintCurve :points="savedPoints" :reductions="savedReductions" />
      </div>

      <!-- ── Page 2 ── -->
      <PrintLogSheet
        :name="saved.name"
        :cone="saved.cone ?? ''"
        :type="typeLabel"
        :peak="printPeak"
        :duration="totalTime"
      />

    </div>

    <!-- Reduction planner -->
    <ReductionPlannerModal
      class="no-print"
      :open="showReductionPlanner"
      :reductions="editReductions"
      @close="showReductionPlanner = false"
      @save="onReductionsSaved"
    />

    <Teleport to="body">
      <Transition name="toast">
        <!-- Clears the iPhone home indicator; bottom-6 alone sat on top of it. -->
        <div
          v-if="status"
          class="no-print fixed left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif bg-celadon-dark text-white max-w-sm w-[calc(100%-2rem)] text-center"
          style="bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))"
        >
          {{ status }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/schedules/[id].vue
import { themeForType, labelForType } from '~/composables/useScheduleTheme'
import { labelForBody } from '~/composables/useScheduleSections'
import { pointsToSegments, segmentsToPoints } from '~/composables/useCurveSegments'

definePageMeta({ middleware: ['auth'] })

const route  = useRoute()
const router = useRouter()

const loading              = ref(true)
const saving               = ref(false)
const status               = ref('')
const form                 = reactive({ name: '', type: 'bisque', cone: '', body: null, description: '' })
const editPoints           = ref([])
const editReductions       = ref([])   // [{ startTemp, endTemp|null, kind }] °C
const editConePack         = ref([])   // planned witness cones — names
const showReductionPlanner = ref(false)
const retargetNote         = ref('')

// The last SAVED row, kept alongside the editable form. The print tree reads
// this and nothing else: a printout that quietly disagreed with the database
// would be worse than no printout, since the whole point is handing it to
// somebody else.
const saved = ref(null)

const id    = computed(() => Number(route.params.id))
const theme = computed(() => themeForType(form.type))

// A built-in. Editable on screen, never written to: Save forks instead.
const isPreset = computed(() => saved.value?.user_id === null)

const { displayTemp, displayDelta, unitLabel } = useTempUnit()
const { tempFor } = useCones()

function onCurveEdit(pts) {
  editPoints.value = pts
}

function flash(msg) {
  status.value = msg
  setTimeout(() => { if (status.value === msg) status.value = '' }, 2800)
}

function onReductionsSaved(list) {
  editReductions.value = list
  showReductionPlanner.value = false
}

watch(id, load, { immediate: true })

async function load() {
  if (isNaN(id.value) || id.value <= 0) {
    router.replace('/schedules/new')
    return
  }

  loading.value = true

  if (route.query.copyOf) {
    flash(`Editing your own copy of "${route.query.copyOf}"`)
    router.replace({ params: route.params, query: {} })
  }

  try {
    const s = await $fetch(`/api/schedules/${id.value}`)

    // A preset loads exactly like anything else. It used to be forked to the
    // user right here, before the page had even rendered - see the header note
    // for why that was wrong. The fork now happens in save(), if it happens.
    form.name            = s.name
    form.type            = s.type ?? 'bisque'
    form.cone            = s.cone ?? ''
    form.body            = s.body ?? null
    form.description     = s.description ?? ''
    editPoints.value     = (s.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
    editReductions.value = (s.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind }))
    editConePack.value   = [...(s.cone_pack ?? [])]

    saved.value = s
    // Only now is the cone watcher armed. The assignments above are a LOAD, not
    // a user changing the cone, and the previous implementation of this page
    // got that wrong — its guard raced the async cones fetch and greeted people
    // with a "your points will be lost" bar on every page open.
    lastCone = form.cone
  } catch (err) {
    flash(`Couldn't load: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
  loading.value = false
}

function todayShort() {
  return new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

// ── Cone retarget ─────────────────────────────────────────────────────────────
// Move the curve to a new peak WITHOUT redrawing it.
//
// WHAT MOVES. Only the summit and the steps that follow it above GLAZE_SEAL_C.
// Everything on the way up below the summit is left alone, because the low end
// of a firing has nothing to do with the cone: water leaves at 100°C and quartz
// inverts at 573°C whether you are going to cone 04 or cone 10. Shifting those
// would be moving landmarks that have not moved.
//
// On the way DOWN the line is glaze seal, around 700-800°C. Above it the
// cooling steps are about the glaze — a crash out of the melt or a fire-down —
// and those were chosen relative to peak, so they shift by the same delta and
// a fire-down that sat 74°C under peak still does. Below it the steps are about
// the body, the cristobalite band and being able to open the kiln, which are
// absolute temperatures. A free fall to 200°C stays 200°C.
//
// RATES ARE HELD and offsets recomputed, so a hotter peak simply takes longer.
// Holding the DURATION instead would silently steepen the final ramp and undo
// the slow approach that evens out heatwork across the load.
const MIN_SENSIBLE_PEAK = 200
const GLAZE_SEAL_C = 700
// A retargeted summit must clear the step before it, or the curve doubles back.
const MIN_STEP_GAP = 20

// Not a ref: nothing renders it, and a ref would make the watcher below fire on
// its own assignment.
let lastCone = ''

function retargetPeak(points, newPeakC) {
  const pts = [...(points ?? [])]
    .filter(p => p && p.offsetMinutes != null && p.targetTemp != null)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)

  const peak = Math.round(Number(newPeakC))
  if (!Number.isFinite(peak) || peak < MIN_SENSIBLE_PEAK) return null
  if (pts.length < 2) return null

  const oldPeak = Math.max(...pts.map(p => p.targetTemp))
  if (oldPeak < MIN_SENSIBLE_PEAK || oldPeak === peak) return null

  const delta = peak - oldPeak
  const { ambient, startMins, segments } = pointsToSegments(pts)
  if (!segments.length) return null

  // The FIRST step reaching the old peak. A hold reads back as `hold` on the
  // step before it, but a drop-and-hold curve returns to peak later, and only
  // the climb is the summit.
  const peakIndex = segments.findIndex(s => s.target === oldPeak)
  if (peakIndex === -1) return null

  // Refuse rather than produce a curve that climbs past its own peak and back.
  const prev = peakIndex === 0 ? ambient : segments[peakIndex - 1].target
  if (peak <= prev + MIN_STEP_GAP) return null

  const out = segments.map((seg, i) => {
    if (i < peakIndex) return { ...seg }
    if (seg.target === oldPeak) return { ...seg, target: peak }
    if (seg.target > GLAZE_SEAL_C) return { ...seg, target: seg.target + delta }
    return { ...seg }
  })

  return {
    points: segmentsToPoints(ambient, out, startMins),
    oldPeak,
    peak,
  }
}

// Silent, because it destroys nothing. The receipt line under the selects and
// the graph redrawing under the cursor are what make it visible.
watch(() => form.cone, (cone) => {
  if (loading.value) return
  if (cone === lastCone) return
  lastCone = cone

  const t = tempFor(cone)
  if (!Number.isFinite(Number(t))) return    // unrated cone, or cones not loaded

  const result = retargetPeak(editPoints.value, t)
  if (!result) return

  editPoints.value = result.points
  retargetNote.value =
    `Peak moved ${displayTemp(result.oldPeak)}${unitLabel.value} → ${displayTemp(result.peak)}${unitLabel.value}. Ramp rates unchanged.`
  setTimeout(() => { retargetNote.value = '' }, 6000)
})

// ── Print ─────────────────────────────────────────────────────────────────────
// Everything below reads `saved`, never `form` or `editPoints`.

const savedPoints = computed(() =>
  (saved.value?.points ?? [])
    .map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
)

const savedReductions = computed(() =>
  (saved.value?.reductions ?? [])
    .filter(r => r.start_temp != null)
    .map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind }))
)

const typeLabel = computed(() => labelForType(saved.value?.type))

// Compared loosely on purpose. An exact deep diff would flag a reordered array
// as a change, and a false negative here costs one reprint rather than a wrong
// document — the print tree reads `saved` regardless of what this says.
const dirty = computed(() => {
  if (!saved.value) return false
  if (form.name !== saved.value.name) return true
  if ((saved.value.points ?? []).length !== editPoints.value.length) return true
  if ((form.cone || null) !== (saved.value.cone ?? null)) return true
  const savedPeak = savedPoints.value.length ? Math.max(...savedPoints.value.map(p => p.targetTemp)) : null
  const editPeak  = editPoints.value.length ? Math.max(...editPoints.value.map(p => p.targetTemp)) : null
  return savedPeak !== editPeak
})

const printedOn = computed(() =>
  new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
)

const printMeta = computed(() => {
  const s = saved.value
  if (!s) return ''
  const parts = [labelForType(s.type)]
  if (s.cone) parts.push(`Cone ${s.cone}`)
  const peak = savedPoints.value.length
    ? Math.max(...savedPoints.value.map(p => p.targetTemp))
    : null
  if (peak !== null) parts.push(`${displayTemp(peak)}${unitLabel.value} peak`)
  return parts.join(' · ')
})

// The course's seven, plus the cone pack, in that order. See the header note.
const printFields = computed(() => [
  { label: 'Date' },
  { label: 'Weather' },
  { label: 'Kiln' },
  { label: 'Load' },
  { label: 'Clay type',     value: saved.value?.body ? labelForBody(saved.value.body) : '' },
  { label: 'Work fired' },
  { label: 'Firing',        value: printMeta.value },
  { label: 'Witness cones', value: (saved.value?.cone_pack ?? []).join(' · ') },
])

// The peak as the log sheet's meta line wants it. Page one shows this through
// printMeta; page two has to say it again because the two get separated.
const printPeak = computed(() => {
  const hi = savedPoints.value.length
    ? Math.max(...savedPoints.value.map(p => p.targetTemp))
    : null
  return hi === null ? '' : `${displayTemp(hi)}${unitLabel.value}`
})

const totalTime = computed(() => {
  const last = savedPoints.value[savedPoints.value.length - 1]
  return last ? fmtMins(last.offsetMinutes) : '—'
})

function fmtMins(m) {
  const h = Math.floor(m / 60), min = Math.round(m % 60)
  if (h === 0) return `${min}m`
  return min === 0 ? `${h}h` : `${h}h ${min}m`
}

function printPlan() {
  // nextTick so any pending reactive update to the print tree has flushed
  // before the browser snapshots the page. window.print blocks the main thread,
  // so a mid-flush call would print a stale DOM.
  nextTick(() => window.print())
}

// ── Save ──────────────────────────────────────────────────────────────────────
function saveBody() {
  return {
    name: form.name.trim(),
    type: form.type,
    cone: form.cone?.trim() || null,
    body: form.body ?? null,
    description: form.description?.trim() || null,
    points: editPoints.value,
    reductions: editReductions.value,   // [{ startTemp, endTemp|null, kind }] °C
    conePack: editConePack.value,
  }
}

// The PUT returns { ok: true }, not the row, so `saved` is rebuilt locally from
// what was just sent. Refetching would be a second round trip to learn
// something already known.
function adoptSaved() {
  saved.value = {
    ...(saved.value ?? {}),
    name:        form.name.trim(),
    type:        form.type,
    cone:        form.cone?.trim() || null,
    body:        form.body ?? null,
    description: form.description?.trim() || null,
    cone_pack:   [...editConePack.value],
    points:      editPoints.value.map(p => ({
      offset_minutes: p.offsetMinutes,
      target_temp:    p.targetTemp,
    })),
    reductions:  editReductions.value.map(r => ({
      start_temp: r.startTemp,
      end_temp:   r.endTemp ?? null,
      kind:       r.kind,
    })),
  }
}

// On a preset this CREATES; on your own schedule it UPDATES. Both paths send
// the same saveBody(), so an edit made before saving a preset lands in the
// copy rather than being thrown away by the fork.
//
// Returns the id to continue with: the new copy's, or the current one.
async function persist() {
  const payload = saveBody()

  if (isPreset.value) {
    // Name untouched? Date it, so the copy is not a second row with the
    // preset's exact name.
    if (payload.name === (saved.value?.name ?? '').trim()) {
      payload.name = `${payload.name} — ${todayShort()}`
    }
    const copy = await $fetch('/api/schedules', {
      method: 'POST',
      body: { ...payload, source: 'preset_copy' },
    })
    return copy.id
  }

  await $fetch(`/api/schedules/${id.value}`, { method: 'PUT', body: payload })
  return id.value
}

async function save() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    const wasPreset = isPreset.value
    const targetId  = await persist()

    if (wasPreset) {
      // load() picks up ?copyOf and shows the flash; the id watcher reloads.
      router.replace(`/schedules/${targetId}?copyOf=${encodeURIComponent(saved.value.name)}`)
      return
    }

    adoptSaved()
    flash('Saved')
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
  } finally {
    saving.value = false
  }
}

async function saveAndStart() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    const targetId = await persist()
    router.push(`/app?startSchedule=${targetId}`)
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
    saving.value = false
  }
}
</script>

<style>
/* LANDSCAPE, BOTH PAGES. Per-page orientation would need CSS named pages
   (`@page plan { size: A4 landscape }` plus `page: plan`), which is Chrome 110
   and Safari 18 upward and silently does nothing below that - the worst
   failure mode for something you only find out about once it is on paper. One
   rule turns the whole job and works everywhere.

   NOT scoped: an at-rule with no selector passes through the scoped-style
   transform untouched, but leaving the block unscoped says so out loud. If a
   global stylesheet also declares @page, whichever loads later wins, so check
   for one before assuming this file is the problem. */
@page {
  size: A4 landscape;
  margin: 12mm;
}
</style>