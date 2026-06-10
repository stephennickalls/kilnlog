<!-- app/pages/schedules/new.vue -->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <header class="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-2xl mx-auto flex items-center gap-2 px-4 sm:px-6 py-3">
        <NuxtLink to="/schedules" class="p-1.5 -ml-1 rounded-lg text-ink-muted hover:text-flame hover:bg-parchment-2 transition-colors shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </NuxtLink>
        <h1 class="flex-1 text-base font-bold text-ink truncate">
          {{ isFromFiring ? 'Save firing as schedule' : 'New schedule' }}
        </h1>
      </div>
    </header>

    <!-- From-firing loading -->
    <div v-if="loadingFiring" class="flex justify-center items-center py-24 text-ink-muted">
      <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
      </svg>
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

      <!-- ── FROM-FIRING SECTION ───────────────────────────────────────── -->
      <template v-if="isFromFiring">

        <!-- Source badge -->
        <div class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-celadon-bg border border-celadon/20 text-sm text-celadon-dark">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 17l6-6 4 4 8-8"/>
          </svg>
          <span>Generated from <strong>{{ firingData?.name }}</strong></span>
        </div>

        <!-- Slider + segment count + reset -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Detail level</label>
            <div class="flex items-center gap-3">
              <span class="text-[11px] tabular-nums text-celadon-dark font-semibold">
                {{ slider >= 1 ? `All ${rawPoints.length} readings` : `${simplified.length} segment${simplified.length === 1 ? '' : 's'}` }}
              </span>
              <button
                class="text-[11px] text-ink-faint hover:text-flame transition-colors font-semibold"
                @click="resetToInitial"
              >↺ Reset</button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-[10px] text-ink-faint w-10 shrink-0">Simple</span>
            <input
              type="range" min="0" max="1" step="0.005"
              :value="slider"
              class="flex-1 h-1.5 rounded-full cursor-pointer"
              style="accent-color: #5f8a78"
              @input="slider = Number($event.target.value)"
            />
            <span class="text-[10px] text-ink-faint w-10 shrink-0 text-right">Detail</span>
          </div>
          <p v-if="hasManualEdits" class="text-[11px] text-amber-600 flex items-center gap-1.5">
            <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            Moving the slider will replace your manual edits
          </p>
        </div>

        <!-- Unified editor — raw readings shown faint underneath via backgroundPoints -->
        <ScheduleCurveEditor
          :model-value="editPoints"
          :background-points="rawPoints"
          @update:model-value="onEditorChange"
        />

      </template>

      <!-- ── PLAIN CREATE: just the editor ───────────────────────────── -->
      <template v-else>
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Schedule curve</label>
          <ScheduleCurveEditor v-model="editPoints" />
        </div>
      </template>

      <!-- ── SHARED: name, type, cone ─────────────────────────────────── -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. Cone 10 reduction"
          class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <FiringTypeSelect v-model="form.type" />
        <ConeSelect v-model="form.cone" />
      </div>

      <!-- ── SHARED: save ──────────────────────────────────────────────── -->
      <div class="pt-2 border-t border-parchment-3">
        <button
          class="w-full py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="save"
        >{{ saving ? 'Saving…' : 'Save schedule' }}</button>
      </div>

    </main>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="status" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif bg-celadon-dark text-white max-w-sm w-[calc(100%-2rem)] text-center">
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

const BISQUE_DEFAULT = [
  { offsetMinutes: 0,   targetTemp: 20   },
  { offsetMinutes: 60,  targetTemp: 120  },
  { offsetMinutes: 180, targetTemp: 600  },
  { offsetMinutes: 300, targetTemp: 1000 },
  { offsetMinutes: 360, targetTemp: 1000 },
  { offsetMinutes: 480, targetTemp: 80   },
]

const route  = useRoute()
const router = useRouter()

// ── Mode ──────────────────────────────────────────────────────────────────────
const fromFiringId = computed(() => route.query.fromFiring ? Number(route.query.fromFiring) : null)
const isFromFiring = computed(() => !!fromFiringId.value)

// ── State ─────────────────────────────────────────────────────────────────────
const loadingFiring = ref(false)
const saving        = ref(false)
const status        = ref('')

// From-firing specific
const firingData        = ref(null)
const rawPoints         = ref([])
const slider            = ref(epsilonToDetail(SUGGESTED_EPSILON))
const simplified        = ref([])
const initialSimplified = ref([])  // stored on load, used by reset
const hasManualEdits    = ref(false)
const regenerating      = ref(false)

// Shared
const form       = reactive({ name: '', type: 'glaze', cone: '' })
const editPoints = ref(BISQUE_DEFAULT.map(p => ({ ...p })))

// ── Slider → re-simplify (slider=1 = all raw readings, no simplification) ────
watch(slider, (val) => {
  const newPts = val >= 1
    ? rawPoints.value.map(p => ({ ...p }))
    : simplify(rawPoints.value, detailToEpsilon(val))
  simplified.value = newPts
  regenerating.value = true
  editPoints.value   = newPts.map(p => ({ ...p }))
  hasManualEdits.value = false
  nextTick(() => { regenerating.value = false })
})

// ── Editor change (only mark manual edits when not regenerating) ───────────────
function onEditorChange(pts) {
  editPoints.value = pts
  if (!regenerating.value) hasManualEdits.value = true
}

// ── Reset to initial simplification ──────────────────────────────────────────
function resetToInitial() {
  regenerating.value = true
  editPoints.value = initialSimplified.value.map(p => ({ ...p }))
  hasManualEdits.value = false
  nextTick(() => { regenerating.value = false })
}

// ── Mount: load firing if from-firing mode ────────────────────────────────────
onMounted(async () => {
  if (!isFromFiring.value) return

  loadingFiring.value = true
  try {
    const data = await $fetch(`/api/firings/${fromFiringId.value}`)
    firingData.value = data

    // Map temperature readings → schedule-shaped points
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

    // Initial simplification — also stored for reset
    const initPts = simplify(rawPoints.value, detailToEpsilon(slider.value))
    simplified.value        = initPts
    initialSimplified.value = initPts.map(p => ({ ...p }))
    editPoints.value        = initPts.map(p => ({ ...p }))

    // Smart defaults
    form.name = `${data.name} (from ${formatFiringDate(data.started_at ?? data.created_at)})`
    form.type = guessType(data.name)

  } catch (err) {
    flash(`Couldn't load firing: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
  loadingFiring.value = false
})

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

// ── Save → POST ───────────────────────────────────────────────────────────────
async function save() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    const result = await $fetch('/api/schedules', {
      method: 'POST',
      body: {
        name:   form.name.trim(),
        type:   form.type,
        cone:   form.cone?.trim() || null,
        source: isFromFiring.value ? 'from_firing' : 'custom',
        points: editPoints.value,
      },
    })
    router.replace(`/schedules/${result.id}`)
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
    saving.value = false
  }
}
</script>