<!-- app/components/StartFiringModal.vue -->
<!--
  Emits @create { name, notes, schedulePoints, reductions, saveToLibrary }.
  reductions: [{ startTemp, endTemp|null }] °C. Reduction trigger sits ABOVE
  the curve editor. saveToLibrary persists the plan as a reusable schedule.
-->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 flex items-end sm:items-center justify-center z-50 font-serif" style="background: rgba(26,18,8,0.6)" @click.self="$emit('close')">
      <div class="bg-parchment w-full sm:w-[580px] sm:rounded-2xl rounded-t-2xl sm:max-h-[88vh] max-h-[92vh] overflow-y-auto flex flex-col border border-parchment-3" style="box-shadow: 0 -8px 40px rgba(26,18,8,0.15)">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-parchment-3 shrink-0">
          <h2 class="text-base font-bold text-ink">Start firing</h2>
          <button class="p-1.5 rounded-lg hover:bg-parchment-2 text-ink-muted hover:text-ink transition-colors" @click="$emit('close')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex flex-col gap-5 px-6 py-5">

          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
            <input
              :value="form.name"
              type="text"
              placeholder="e.g. Cone 10 reduction"
              class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
              @input="onNameInput($event.target.value)"
            >
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Notes <span class="text-parchment-4 font-normal normal-case tracking-normal">(optional)</span></label>
            <textarea v-model="form.notes" rows="2" placeholder="Clay body, glazes, weather..." class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif resize-none" />
          </div>

          <!-- Plan for this firing -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Plan for this firing</label>
              <div class="flex-1" />
              <TempUnitToggle />
            </div>

            <!-- ONE "Start from" control -->
            <div class="flex flex-col gap-1.5">
              <div class="relative">
                <select
                  class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 pr-9 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif appearance-none"
                  :value="startFrom"
                  @change="applyStartFrom($event.target.value)"
                >
                  <option v-if="preselect" value="preselect">Continuing: {{ preselect.name || 'loaded plan' }}</option>
                  <option value="blank">Blank curve</option>
                  <optgroup label="Starters">
                    <option value="starter:bisque">🏺 Bisque starter</option>
                    <option value="starter:glaze">✨ Glaze starter</option>
                  </optgroup>
                  <optgroup v-if="myLibrary.length" label="Your schedules">
                    <option v-for="lib in myLibrary" :key="'my'+lib.id" :value="'lib:'+lib.id">
                      {{ lib.name }}{{ lib.cone ? ` · Cone ${lib.cone}` : '' }}
                    </option>
                  </optgroup>
                  <optgroup v-for="type in presetTypes" :key="'pt'+type" :label="`${type.charAt(0).toUpperCase() + type.slice(1)} presets`">
                    <option v-for="lib in presetsOfType(type)" :key="'pr'+lib.id" :value="'lib:'+lib.id">
                      {{ lib.name }}{{ lib.cone ? ` · Cone ${lib.cone}` : '' }}
                    </option>
                  </optgroup>
                  <optgroup v-if="pastFirings.length" label="Your past firings">
                    <option v-for="f in pastFirings" :key="'pf'+f.id" :value="'past:'+f.id">
                      {{ f.name }} · {{ formatDate(f.created_at) }}
                    </option>
                  </optgroup>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </div>

              <p v-if="loadingPast" class="text-[11px] text-ink-faint">Loading plan…</p>
              <p v-else class="text-[11px] text-ink-muted leading-snug">
                Pick a starting point, then drag to adjust. This plan is saved with <strong>this firing only</strong> — unless you tick "save to library" below.
              </p>
            </div>

            <!-- Reduction planner trigger + summary (above the editor) -->
            <div class="flex items-center justify-between gap-2 px-0.5">
              <span class="text-[11px] text-ink-muted">
                {{ reductions.length
                  ? `${reductions.length} planned reduction${reductions.length === 1 ? '' : 's'}`
                  : 'No reductions planned' }}
              </span>
              <button
                class="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                @click="showReductionPlanner = true"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                {{ reductions.length ? 'Edit reduction' : 'Add reduction' }}
              </button>
            </div>

            <!-- Curve editor (model stays °C) -->
            <ScheduleCurveEditor v-model="form.schedulePoints" :reductions="reductions" />
          </div>

          <!-- Save to library -->
          <label class="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-parchment-3 bg-white cursor-pointer">
            <input type="checkbox" :checked="saveToLibrary" class="mt-0.5 accent-flame" @change="saveToLibrary = $event.target.checked">
            <span class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-ink">Also save this plan to my library</span>
              <span class="text-[11px] text-ink-muted leading-snug">Keep this curve (and its reductions) as a reusable schedule you can start again later.</span>
            </span>
          </label>

        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-6 pb-6 pt-4 border-t border-parchment-3 shrink-0">
          <button class="px-4 py-2 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-lg transition-colors" @click="$emit('close')">Cancel</button>
          <button class="px-4 py-2 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!form.name.trim()" @click="submit">Start firing →</button>
        </div>

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

const startFrom            = ref('starter:bisque')
const loadingPast          = ref(false)
const nameAutoFilled       = ref(true)
const reductions           = ref([])          // [{ startTemp, endTemp|null }] °C
const saveToLibrary        = ref(false)
const showReductionPlanner = ref(false)

const form = reactive({
  name:           '',
  notes:          '',
  schedulePoints: BISQUE_POINTS.map(p => ({ ...p })),
})

// ── Source groupings ──────────────────────────────────────────────────────────
const myLibrary     = computed(() => props.library.filter(l => l.user_id !== null))
const presetLibrary = computed(() => props.library.filter(l => l.user_id === null))
const presetTypes   = computed(() => [...new Set(presetLibrary.value.map(l => l.type))].sort())
function presetsOfType(type) { return presetLibrary.value.filter(l => l.type === type) }

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
    return lib?.name ?? ''
  }
  if (token.startsWith('past:')) {
    const f = props.pastFirings.find(x => String(x.id) === token.slice(5))
    return f?.name ?? ''
  }
  return ''
}
function maybeFillName(token) {
  if (!nameAutoFilled.value) return
  const s = suggestedName(token)
  if (s) form.name = s
}
function onNameInput(val) {
  form.name = val
  nameAutoFilled.value = false
}

// ── Reductions from planner ───────────────────────────────────────────────────
function onReductionsSaved(list) {
  reductions.value = list
  showReductionPlanner.value = false
}

// ── Apply a "Start from" selection ────────────────────────────────────────────
// Library schedules and past firings carry their own reductions; selecting one
// adopts them. Starters/blank clear reductions.
async function applyStartFrom(token) {
  startFrom.value = token

  if (token === 'preselect') return
  if (token === 'blank') {
    form.schedulePoints = []
    reductions.value = []
    maybeFillName(token)
    return
  }
  if (token === 'starter:bisque') {
    form.schedulePoints = BISQUE_POINTS.map(p => ({ ...p }))
    reductions.value = []
    maybeFillName(token)
    return
  }
  if (token === 'starter:glaze') {
    form.schedulePoints = GLAZE_POINTS.map(p => ({ ...p }))
    reductions.value = []
    maybeFillName(token)
    return
  }
  if (token.startsWith('lib:')) {
    const lib = props.library.find(l => String(l.id) === token.slice(4))
    if (lib) {
      form.schedulePoints = (lib.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
      reductions.value = (lib.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null }))
      maybeFillName(token)
    }
    return
  }
  if (token.startsWith('past:')) {
    loadingPast.value = true
    try {
      const data = await $fetch(`/api/firings/${token.slice(5)}`)
      form.schedulePoints = (data.schedule ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
      reductions.value = (data.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null }))
      maybeFillName(token)
    } catch {
      // leave existing curve on failure
    } finally {
      loadingPast.value = false
    }
    return
  }
}

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

// ── Open: seed from preselect, else default to bisque starter ─────────────────
watch(() => props.open, (val) => {
  if (!val) return
  loadingPast.value          = false
  nameAutoFilled.value       = true
  saveToLibrary.value        = false
  showReductionPlanner.value = false
  form.notes                 = ''

  if (props.preselect) {
    form.name           = props.preselect.name ?? ''
    form.schedulePoints = (props.preselect.schedulePoints ?? []).map(p => ({ ...p }))
    reductions.value    = (props.preselect.reductions ?? []).map(r => ({ ...r }))
    startFrom.value     = 'preselect'
    nameAutoFilled.value = false
  } else {
    startFrom.value     = 'starter:bisque'
    form.schedulePoints = BISQUE_POINTS.map(p => ({ ...p }))
    reductions.value    = []
    form.name           = ''
    maybeFillName('starter:bisque')
  }
})

function submit() {
  if (!form.name.trim()) return
  emit('create', {
    name:           form.name,
    notes:          form.notes,
    schedulePoints: form.schedulePoints,
    reductions:     reductions.value,        // [{ startTemp, endTemp|null }] °C
    saveToLibrary:  saveToLibrary.value,
  })
}
</script>