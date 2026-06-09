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

        <!-- Dual-layer preview SVG -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Preview</label>
            <div class="flex items-center gap-3 text-[10px] text-ink-faint">
              <span class="flex items-center gap-1.5">
                <span class="inline-block w-5 border-t border-parchment-4"/>actual readings
              </span>
              <span class="flex items-center gap-1.5 text-celadon-dark font-semibold">
                <span class="inline-block w-5 border-t-2 border-celadon"/>schedule
              </span>
            </div>
          </div>
          <div class="bg-white border border-parchment-3 rounded-xl overflow-hidden" style="box-shadow: inset 0 1px 3px rgba(58,30,8,0.04)">
            <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full block" preserveAspectRatio="xMidYMid meet">
              <!-- Grid -->
              <line v-for="t in prevTempLines" :key="'pgt'+t" :x1="PAD_L" :y1="pTempToY(t)" :x2="SVG_W - PAD_R" :y2="pTempToY(t)" stroke="#f5f5f4" stroke-width="1"/>
              <line v-for="m in prevTimeLines" :key="'pgm'+m" :x1="pMinsToX(m)" :y1="PAD_T" :x2="pMinsToX(m)" :y2="SVG_H - PAD_B" stroke="#f5f5f4" stroke-width="1"/>
              <!-- Axis labels -->
              <text v-for="t in prevTempLines" :key="'ptl'+t" :x="PAD_L - 6" :y="pTempToY(t) + 4" text-anchor="end" font-size="9" font-family="Georgia, serif" fill="#a8a29e">{{ t }}°</text>
              <text v-for="m in prevTimeLines" :key="'pml'+m" :x="pMinsToX(m)" :y="SVG_H - PAD_B + 14" text-anchor="middle" font-size="9" font-family="Georgia, serif" fill="#a8a29e">{{ minsLabel(m) }}</text>
              <!-- Raw readings — faint -->
              <path v-if="rawSvgPath" :d="rawSvgPath" fill="none" stroke="#d6d3d1" stroke-width="1" stroke-linejoin="round"/>
              <!-- Simplified fill + line — celadon -->
              <path v-if="simplifiedFillPath" :d="simplifiedFillPath" fill="rgba(95,138,120,0.08)"/>
              <path v-if="simplifiedSvgPath" :d="simplifiedSvgPath" fill="none" stroke="#5f8a78" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <!-- Simplified waypoint dots -->
              <circle
                v-for="pt in simplified" :key="`dot-${pt.offsetMinutes}-${pt.targetTemp}`"
                :cx="pMinsToX(pt.offsetMinutes)" :cy="pTempToY(pt.targetTemp)"
                r="4" fill="white" stroke="#5f8a78" stroke-width="2"
              />
            </svg>
          </div>
        </div>

        <!-- Detail slider -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Detail level</label>
            <span class="text-[11px] tabular-nums text-celadon-dark font-semibold">{{ simplified.length }} segment{{ simplified.length === 1 ? '' : 's' }}</span>
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

        <!-- Fine-tune editor -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Fine-tune</label>
          <ScheduleCurveEditor :model-value="editPoints" @update:model-value="onEditorChange" />
        </div>

      </template>

      <!-- ── PLAIN CREATE: just the editor ───────────────────────────── -->
      <template v-else>
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Schedule curve</label>
          <ScheduleCurveEditor v-model="editPoints" />
        </div>
      </template>

      <!-- ── SHARED: soft warnings ────────────────────────────────────── -->
      <div
        v-for="(w, i) in warnings" :key="i"
        class="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800"
      >
        <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        {{ w }}
      </div>

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
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Type</label>
          <select
            v-model="form.type"
            class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif appearance-none"
          >
            <option v-for="t in FIRING_TYPES" :key="t" :value="t">{{ t.charAt(0).toUpperCase() + t.slice(1) }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            Cone <span class="text-parchment-4 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            v-model="form.cone"
            type="text"
            placeholder="6, 10, 06…"
            class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
          />
        </div>
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

const FIRING_TYPES = ['bisque', 'glaze', 'raku', 'other']

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
const firingData     = ref(null)
const rawPoints      = ref([])
const slider         = ref(epsilonToDetail(SUGGESTED_EPSILON))
const simplified     = ref([])
const hasManualEdits = ref(false)
const regenerating   = ref(false)

// Shared
const form       = reactive({ name: '', type: 'glaze', cone: '' })
const editPoints = ref(BISQUE_DEFAULT.map(p => ({ ...p })))

// ── SVG preview constants (mirror ScheduleCurveEditor) ────────────────────────
const SVG_W = 520, SVG_H = 220
const PAD_L = 38, PAD_R = 12, PAD_T = 16, PAD_B = 24

const previewMaxMins = computed(() => {
  if (!rawPoints.value.length) return 360
  return Math.max(Math.max(...rawPoints.value.map(p => p.offsetMinutes)) + 60, 360)
})
const previewMaxTemp = computed(() => {
  if (!rawPoints.value.length) return 1200
  return Math.ceil((Math.max(...rawPoints.value.map(p => p.targetTemp)) + 50) / 100) * 100
})

function pMinsToX(m) { return PAD_L + (m / previewMaxMins.value) * (SVG_W - PAD_L - PAD_R) }
function pTempToY(t) { return PAD_T + (1 - t / previewMaxTemp.value) * (SVG_H - PAD_T - PAD_B) }

function buildSvgPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pMinsToX(pts[0].offsetMinutes)} ${pTempToY(pts[0].targetTemp)}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pMinsToX(pts[i].offsetMinutes)} ${pTempToY(pts[i].targetTemp)}`
  return d
}

const rawSvgPath        = computed(() => buildSvgPath(rawPoints.value))
const simplifiedSvgPath = computed(() => buildSvgPath(simplified.value))
const simplifiedFillPath = computed(() => {
  if (simplified.value.length < 2) return ''
  const pts = simplified.value
  const bottom = SVG_H - PAD_B
  return `${simplifiedSvgPath.value} L ${pMinsToX(pts[pts.length - 1].offsetMinutes)} ${bottom} L ${pMinsToX(pts[0].offsetMinutes)} ${bottom} Z`
})

const prevTempLines = computed(() => {
  const lines = []
  for (let t = 0; t <= previewMaxTemp.value; t += 200) lines.push(t)
  return lines
})
const prevTimeLines = computed(() => {
  const step = previewMaxMins.value <= 480 ? 120 : 240
  const lines = []
  for (let m = 0; m <= previewMaxMins.value; m += step) lines.push(m)
  return lines
})
function minsLabel(m) {
  const h = Math.floor(m / 60), min = m % 60
  return h === 0 ? `${m}m` : min === 0 ? `${h}h` : `${h}h${min}m`
}

// ── Warnings (shared) ─────────────────────────────────────────────────────────
const warnings = computed(() => {
  const pts = [...editPoints.value].sort((a, b) => a.offsetMinutes - b.offsetMinutes)
  return pts.slice(1).flatMap((curr, i) => {
    const prev = pts[i]
    const mins = curr.offsetMinutes - prev.offsetMinutes
    if (mins <= 0) return []
    const rate = (curr.targetTemp - prev.targetTemp) / mins * 60
    return Math.abs(rate) > 200
      ? [`Segment ${i + 1}→${i + 2}: ${rate > 0 ? 'ramp' : 'cooling'} rate ${Math.round(Math.abs(rate))}°C/hr — risk of thermal shock`]
      : []
  })
})

// ── Slider → re-simplify ─────────────────────────────────────────────────────
watch(slider, (val) => {
  const newPts = simplify(rawPoints.value, detailToEpsilon(val))
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

    // Initial simplification at default slider value
    const initPts = simplify(rawPoints.value, detailToEpsilon(slider.value))
    simplified.value = initPts
    editPoints.value = initPts.map(p => ({ ...p }))

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