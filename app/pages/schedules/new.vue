<!-- File: app/pages/schedules/new.vue -->
<!--
  Two modes in one page: plain create (seeded from the library) and
  from-firing (?fromFiring=id), where a real firing's readings are simplified
  into a reusable curve via the detail slider.

  ?then=fire means the user arrived from Start firing's "Build a new plan", so
  saving lights the firing rather than dropping them on the schedule page.

  CURVE GENERATION (Aug 2026): the local BISQUE_DEFAULT constant is gone. Type
  and cone now drive the curve through useAutoCurve — pick either one in either
  order and the curve rebuilds from the pair. That rule and the profiles behind
  it live in useStarterCurve.js, shared with the Steps table's quick starts,
  because five copies of "a reasonable bisque" in five files is how they all
  ended up different.

  The rebuild is only silent while the curve is still machine-made. Once the
  points came from somewhere real — a library seed, a firing's readings, a drag
  in the editor — changing type or cone offers a rebuild instead of taking one.

  THIS PAGE AND /schedules/[id] ARE NO LONGER TWINS (Sep 2026). Full
  regeneration is right HERE and wrong there. On a blank new schedule the curve
  on screen is machine output and replacing it costs nobody anything. On a saved
  schedule it is somebody's work, so that page retargets the peak and keeps the
  shape instead. Do not "restore consistency" by making one behave like the
  other — the difference is the point.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <AppNav
      :crumbs="[
        { label: 'Schedules', to: '/schedules' },
        { label: isFromFiring ? 'Save firing as schedule' : 'New schedule' },
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

    <div v-if="loadingFiring" class="flex justify-center items-center py-24 text-ink-muted">
      <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
      </svg>
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-safe flex flex-col gap-5 min-w-0">

      <!-- Arrived from Start firing: say where this ends up. -->
      <div v-if="startAfterSave" class="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-flame-bg border border-flame/20 text-sm text-flame-dark min-w-0">
        <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        <span class="min-w-0 break-words">Build your plan here — saving it will start the firing.</span>
      </div>

      <!-- ── FROM-FIRING: source badge + slider ────────────────────────── -->
      <template v-if="isFromFiring">
        <div class="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-celadon-bg border border-celadon/20 text-sm text-celadon-dark min-w-0">
          <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 17l6-6 4 4 8-8"/>
          </svg>
          <span class="min-w-0 break-words">Generated from <strong>{{ firingData?.name }}</strong></span>
        </div>
        <div class="flex flex-col gap-2">
          <!-- flex-wrap: "All 412 readings" plus the label plus Reset is wider
               than 320px on one line. -->
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Detail level</label>
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-[11px] tabular-nums text-celadon-dark font-semibold truncate">
                {{ slider >= 1 ? `All ${rawPoints.length} readings` : `${simplified.length} segment${simplified.length === 1 ? '' : 's'}` }}
              </span>
              <button class="text-[11px] text-ink-faint hover:text-flame transition-colors font-semibold shrink-0 py-1" @click="resetToInitial">↺ Reset</button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-[10px] text-ink-faint w-10 shrink-0">Simple</span>
            <!-- py-2 gives the 1.5px-tall track a thumb-sized hit area. -->
            <input type="range" min="0" max="1" step="0.005" :value="slider"
              class="flex-1 min-w-0 h-1.5 py-2 rounded-full cursor-pointer" style="accent-color: #5f8a78"
              aria-label="Detail level"
              @input="slider = Number($event.target.value)" />
            <span class="text-[10px] text-ink-faint w-10 shrink-0 text-right">Detail</span>
          </div>
          <!-- The slider REGENERATES from the raw readings, so it necessarily
               discards manual point edits made after sliding. -->
          <p v-if="hasManualEdits" class="text-[11px] text-amber-600 flex items-start gap-1.5">
            <svg class="w-3 h-3 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            Moving the slider will replace your manual edits
          </p>
        </div>
      </template>

      <!-- ── PLAIN CREATE: seed from library ──────────────────────────── -->
      <!-- "Blank curve" is not blank: it regenerates from the current type and
           cone, because an empty grid is a worse starting point than a
           conventional curve you can drag. -->
      <template v-else>
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Start from</label>
          <div class="relative">
            <select v-model="selectedLibraryId"
              class="input rounded-xl px-4 py-2.5 pr-9 appearance-none focus:border-flame focus:ring-flame/10">
              <option value="">Standard curve for this type and cone</option>
              <optgroup v-if="userSchedules.length" label="Your schedules">
                <option v-for="s in userSchedules" :key="s.id" :value="s.id">{{ s.name }}</option>
              </optgroup>
              <optgroup v-if="presetSchedules.length" label="Presets">
                <option v-for="s in presetSchedules" :key="s.id" :value="s.id">{{ s.name }}</option>
              </optgroup>
            </select>
            <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </template>

      <!-- ── SHARED: name ──────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
        <input v-model="form.name" type="text" placeholder="e.g. Cone 10 reduction"
          class="input rounded-xl px-4 py-2.5 focus:border-flame focus:ring-flame/10" />
      </div>

      <!-- ── SHARED: type + cone ───────────────────────────────────────── -->
      <!-- Two selects side by side leaves ~140px each at 320px, which truncates
           every cone label. Stacked below 380px. -->
      <div class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
        <FiringTypeSelect v-model="form.type" />
        <ConeSelect v-model="form.cone" />
      </div>

      <!-- ── SHARED: description ───────────────────────────────────────── -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Description <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
        <textarea v-model="form.description" rows="2" maxlength="500"
          placeholder="Notes about this schedule — when to use it, glaze pairings, quirks…"
          class="input rounded-xl px-4 py-2.5 resize-none focus:border-flame focus:ring-flame/10" />
      </div>

      <!-- ── SHARED: curve ─────────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        <!-- Two groups with justify-between: a flex-1 spacer forced label +
             badge + unit toggle + reduction button onto one line, which ran off
             the screen. -->
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div class="flex items-center gap-2 min-w-0">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Curve</label>
            <span v-if="form.type" class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" :class="theme.badgeText">{{ form.type }}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <!-- The Steps table asks for a RATE (°C/hr vs °F/hr), so a user
                 working from a Fahrenheit source needs to flip and check
                 without leaving the page. -->
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

        <!-- Only appears when the curve is the user's own work and the type or
             cone moved under it. -->
        <CurveRebuildBar
          :visible="curveOffer"
          :label="curveRebuildLabel"
          @apply="rebuildCurve"
          @dismiss="dismissCurveOffer"
        />

        <!-- From-firing: raw readings faint underneath -->
        <ScheduleCurveEditor
          v-if="isFromFiring"
          :model-value="editPoints"
          :background-points="rawPoints"
          :reductions="editReductions"
          :stroke="theme.stroke"
          :fill="theme.fill"
          @update:model-value="onEditorChange"
        />
        <ScheduleCurveEditor
          v-else
          :model-value="editPoints"
          :reductions="editReductions"
          :stroke="theme.stroke"
          :fill="theme.fill"
          @update:model-value="onEditorChange"
        />
        <div class="pt-3 border-t border-parchment-3">
          <ConePackEditor v-model="editConePack" :target-cone="form.cone" />
        </div>
      </div>

      <!-- ── SHARED: save ──────────────────────────────────────────────── -->
      <div class="pt-2 border-t border-parchment-3">
        <button
          class="w-full min-h-[44px] py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="save"
        >{{ saving ? 'Saving…' : (startAfterSave ? 'Save & start firing →' : 'Save schedule') }}</button>
      </div>

    </main>

    <!-- Reduction planner -->
    <ReductionPlannerModal
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
          class="fixed left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif bg-celadon-dark text-white max-w-sm w-[calc(100%-2rem)] text-center"
          style="bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))"
        >
          {{ status }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/schedules/new.vue
import { themeForType } from '~/composables/useScheduleTheme'
import { simplify, SUGGESTED_EPSILON, detailToEpsilon, epsilonToDetail } from '~/composables/useCurveSimplify'

definePageMeta({ middleware: ['auth'], path: '/schedules/new' })

const route  = useRoute()
const router = useRouter()

const fromFiringId = computed(() => route.query.fromFiring ? Number(route.query.fromFiring) : null)
const isFromFiring = computed(() => !!fromFiringId.value)

// From StartFiringModal's "Build a new plan": save should light the firing.
const startAfterSave = computed(() => route.query.then === 'fire')

// ── State ─────────────────────────────────────────────────────────────────────
const loadingFiring     = ref(false)
const saving            = ref(false)
const status            = ref('')

// From-firing
const firingData        = ref(null)
const rawPoints         = ref([])
const slider            = ref(epsilonToDetail(SUGGESTED_EPSILON))
const simplified        = ref([])
const initialSimplified = ref([])
const hasManualEdits    = ref(false)
const regenerating      = ref(false)

// Shared
const form       = reactive({ name: '', type: 'bisque', cone: '', description: '' })
const editPoints = ref([])
const theme      = computed(() => themeForType(form.type))

const editReductions       = ref([])   // [{ startTemp, endTemp|null, kind }] °C
const editConePack         = ref([])   // planned witness cones — names
const showReductionPlanner = ref(false)

// ── Type + cone → curve ───────────────────────────────────────────────────────
// From-firing points are derived from real readings, so they start adopted,
// not generated: changing the type there must never wipe the simplified curve.
// A plain create starts generated and rebuilds freely until the user drags a
// point or seeds from the library.
const {
  offer:        curveOffer,
  label:        curveRebuildLabel,
  rebuild:      rebuildCurve,
  adopt:        adoptCurve,
  markEdited:   markCurveEdited,
  dismissOffer: dismissCurveOffer,
} = useAutoCurve(form, editPoints, { generated: !isFromFiring.value })

function onReductionsSaved(list) {
  editReductions.value = list
  showReductionPlanner.value = false
}

// Plain create: seed from library
const librarySchedules  = ref([])
const selectedLibraryId = ref('')
const userSchedules     = computed(() => librarySchedules.value.filter(s => s.user_id !== null))
const presetSchedules   = computed(() => librarySchedules.value.filter(s => s.user_id === null))

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!isFromFiring.value) {
    // Something conventional on screen before the library request returns.
    // useAutoCurve redoes this once /api/cones lands with the real cone
    // temperature, since until then the peak is only a type fallback.
    rebuildCurve()
    try { librarySchedules.value = await $fetch('/api/schedules') } catch {}
    if (startAfterSave.value) form.name = `Firing — ${todayShort()}`
    return
  }

  loadingFiring.value = true
  try {
    const data = await $fetch(`/api/firings/${fromFiringId.value}`)
    firingData.value = data

    rawPoints.value = (data.readings ?? [])
      .filter(r => r.temperature != null)
      .map(r => ({
        offsetMinutes: Math.round((r.timestamp - data.started_at) / 60),
        targetTemp:    r.temperature,
      }))
      .sort((a, b) => a.offsetMinutes - b.offsetMinutes)

    if (!rawPoints.value.length) {
      flash('No readings found for this firing — starting blank')
      loadingFiring.value = false
      return
    }

    const initPts = simplify(rawPoints.value, detailToEpsilon(slider.value))
    simplified.value        = initPts
    initialSimplified.value = initPts.map(p => ({ ...p }))
    editPoints.value        = initPts.map(p => ({ ...p }))

    // Before form.type is assigned: that assignment would otherwise be read as
    // the user changing the type and raise a rebuild offer over a curve they
    // never chose.
    adoptCurve()

    form.name = `${data.name} (from ${formatFiringDate(data.started_at ?? data.created_at)})`
    form.type = guessType(data.name)

    // "Save this firing as a schedule" should keep where you actually reduced,
    // and which cones you had in the kiln.
    editReductions.value = (data.reductions ?? [])
      .filter(r => r.start_temp != null)
      .map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind }))
    editConePack.value = [...(data.cone_pack ?? [])]
  } catch (err) {
    flash(`Couldn't load firing: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
  loadingFiring.value = false
})

function todayShort() {
  return new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}
function formatFiringDate(unix) {
  if (!unix) return 'firing'
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}
function guessType(name) {
  const n = (name ?? '').toLowerCase()
  if (n.includes('bisque') || n.includes('biscuit')) return 'bisque'
  if (n.includes('raku')) return 'raku'
  return 'glaze'
}
function flash(msg) {
  status.value = msg
  setTimeout(() => { if (status.value === msg) status.value = '' }, 2800)
}

// ── Seed from library ─────────────────────────────────────────────────────────
watch(selectedLibraryId, (val) => {
  if (!val) {
    // Back to generated. The type and cone on screen still stand, so this
    // rebuilds from them rather than clearing to an empty grid.
    editReductions.value = []   // blank slate, no leak from the last pick
    editConePack.value   = []
    form.name = ''
    rebuildCurve()
    return
  }
  const sched = librarySchedules.value.find(s => s.id === Number(val))
  if (!sched) return
  editPoints.value = (sched.points ?? [])
    .sort((a, b) => a.offset_minutes - b.offset_minutes)
    .map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
  // The source schedule's planned atmosphere and cone pack come along too.
  editReductions.value = (sched.reductions ?? [])
    .filter(r => r.start_temp != null)
    .map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind }))
  editConePack.value = [...(sched.cone_pack ?? [])]

  // Before the type/cone assignments below, for the same reason as from-firing.
  adoptCurve()

  form.name = ''
  form.type = sched.type ?? 'glaze'
  form.cone = sched.cone ?? ''
})

// ── Slider ────────────────────────────────────────────────────────────────────
watch(slider, (val) => {
  const newPts = val >= 1
    ? rawPoints.value.map(p => ({ ...p }))
    : simplify(rawPoints.value, detailToEpsilon(val))
  simplified.value     = newPts
  regenerating.value   = true
  editPoints.value     = newPts.map(p => ({ ...p }))
  hasManualEdits.value = false
  adoptCurve()          // simplified readings, not a generated curve
  nextTick(() => { regenerating.value = false })
})

function onEditorChange(pts) {
  editPoints.value = pts
  if (!regenerating.value) hasManualEdits.value = true
  markCurveEdited()
}
function resetToInitial() {
  regenerating.value   = true
  editPoints.value     = initialSimplified.value.map(p => ({ ...p }))
  hasManualEdits.value = false
  adoptCurve()
  nextTick(() => { regenerating.value = false })
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    const result = await $fetch('/api/schedules', {
      method: 'POST',
      body: {
        name:        form.name.trim(),
        type:        form.type,
        cone:        form.cone?.trim() || null,
        description: form.description?.trim() || null,
        source:      isFromFiring.value ? 'from_firing' : 'custom',
        points:      editPoints.value,
        reductions:  editReductions.value,   // [{ startTemp, endTemp|null, kind }] °C
        conePack:    editConePack.value,
      },
    })
    // Came from Start firing: save and light it, rather than dropping the user
    // on the schedule page to find the button.
    if (startAfterSave.value) {
      router.replace(`/app?startSchedule=${result.id}`)
      return
    }
    router.replace(`/schedules/${result.id}`)
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
    saving.value = false
  }
}
</script>