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
            <input v-model="form.name" type="text" placeholder="e.g. Cone 10 reduction" class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Notes <span class="text-parchment-4 font-normal normal-case tracking-normal">(optional)</span></label>
            <textarea v-model="form.notes" rows="2" placeholder="Clay body, glazes, weather..." class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif resize-none" />
          </div>

          <!-- Mode -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Mode</label>
            <div class="flex rounded-xl border border-parchment-3 overflow-hidden">
              <button
                class="flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                :class="form.mode === 'manual' ? 'bg-flame text-parchment' : 'bg-white text-ink-muted hover:bg-parchment-2'"
                @click="form.mode = 'manual'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Manual log
              </button>
              <button
                class="flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                :class="form.mode === 'connected' ? 'bg-flame text-parchment' : 'bg-white text-ink-muted hover:bg-parchment-2'"
                @click="form.mode = 'connected'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                Connected
              </button>
            </div>
            <p class="text-xs text-ink-muted">
              <template v-if="form.mode === 'connected'">Readings stream automatically from your ESP32 over WiFi.</template>
              <template v-else>You enter temperature readings manually at your own intervals.</template>
            </p>
          </div>

          <!-- Sensors -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
              Sensors
              <span class="text-parchment-4 font-normal normal-case tracking-normal ml-1">(optional — assign now or after starting)</span>
            </label>

            <!-- Has sensors -->
            <div v-if="props.sensors.length" class="flex flex-col gap-1.5">
              <button
                v-for="sensor in props.sensors"
                :key="sensor.id"
                type="button"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left"
                :class="form.selectedSensors.includes(sensor.id)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-parchment-3 bg-white hover:bg-parchment-2'"
                @click="toggleSensor(sensor.id)"
              >
                <!-- Checkbox -->
                <div
                  class="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                  :class="form.selectedSensors.includes(sensor.id) ? 'bg-blue-500 border-blue-500' : 'border-parchment-3'"
                >
                  <svg v-if="form.selectedSensors.includes(sensor.id)" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </div>
                <!-- Sensor icon -->
                <svg class="w-4 h-4 shrink-0" :class="form.selectedSensors.includes(sensor.id) ? 'text-blue-500' : 'text-ink-faint'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                </svg>
                <!-- Name -->
                <span class="text-sm font-semibold flex-1 truncate" :class="form.selectedSensors.includes(sensor.id) ? 'text-blue-700' : 'text-ink'">
                  {{ sensor.name }}
                </span>
                <!-- Online/offline pill -->
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                  :class="sensor.online
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-parchment-2 text-ink-faint border border-parchment-3'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="sensor.online ? 'bg-green-500' : 'bg-parchment-4'"></span>
                  {{ sensor.online ? 'Online' : 'Offline' }}
                </span>
              </button>
              <p v-if="form.mode === 'connected' && !form.selectedSensors.length" class="text-[11px] text-amber-600 mt-0.5">
                ⚠ No sensor selected — you can add one after starting too.
              </p>
            </div>

            <!-- No sensors -->
            <div v-else class="flex items-center gap-3 bg-parchment rounded-xl px-4 py-3 border border-parchment-3">
              <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
              </svg>
              <p class="text-xs text-ink-muted">No sensors registered yet. <NuxtLink to="/sensors" class="text-flame font-semibold hover:underline">Add one →</NuxtLink></p>
            </div>
          </div>

          <!-- Schedule section -->
          <div class="flex flex-col gap-3">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Schedule curve</label>

            <!-- Controls row -->
            <div class="flex items-center gap-2 flex-wrap">

              <!-- Bisque / Glaze quick-start -->
              <div class="flex rounded-lg border border-parchment-3 overflow-hidden text-xs font-semibold shrink-0">
                <button
                  class="px-3 py-1.5 transition-colors"
                  :class="quickType === 'bisque' ? 'bg-flame text-parchment' : 'bg-white text-ink-muted hover:bg-parchment-2'"
                  @click="applyQuick('bisque')"
                >🏺 Bisque</button>
                <button
                  class="px-3 py-1.5 border-l border-parchment-3 transition-colors"
                  :class="quickType === 'glaze' ? 'bg-flame text-parchment' : 'bg-white text-ink-muted hover:bg-parchment-2'"
                  @click="applyQuick('glaze')"
                >✨ Glaze</button>
              </div>

              <span class="text-xs text-ink-faint">or load:</span>

              <!-- Library preset dropdown -->
              <div class="relative" v-if="library.length">
                <select
                  class="appearance-none bg-white border border-parchment-3 rounded-lg pl-3 pr-7 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-flame cursor-pointer font-serif max-w-[160px]"
                  :value="selectedLibraryId ?? ''"
                  @change="applyLibraryById($event.target.value)"
                >
                  <option value="" disabled>Preset library…</option>
                  <optgroup v-for="type in libraryTypes" :key="type" :label="type.charAt(0).toUpperCase() + type.slice(1)">
                    <option v-for="lib in library.filter(l => l.type === type)" :key="lib.id" :value="lib.id">
                      {{ lib.name }}{{ lib.cone ? ` · Cone ${lib.cone}` : '' }}
                    </option>
                  </optgroup>
                </select>
                <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </div>

              <!-- Past firings dropdown -->
              <div class="relative" v-if="pastFirings.length">
                <select
                  class="appearance-none bg-white border border-parchment-3 rounded-lg pl-3 pr-7 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-flame cursor-pointer font-serif max-w-[160px]"
                  :value="selectedPastId ?? ''"
                  @change="loadPastFiring($event.target.value)"
                >
                  <option value="" disabled>Past firings…</option>
                  <option v-for="f in pastFirings" :key="f.id" :value="f.id">{{ f.name }} · {{ formatDate(f.created_at) }}</option>
                </select>
                <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </div>

            </div>

            <!-- Applied label / loading state -->
            <p v-if="loadingPast" class="text-[11px] text-ink-faint -mt-1">Loading…</p>
            <p v-else-if="appliedLabel" class="text-[11px] text-flame font-semibold -mt-1 flex items-center gap-1">
              <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              {{ appliedLabel }}
            </p>

            <!-- Curve editor -->
            <ScheduleCurveEditor v-model="form.schedulePoints" />
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-6 pb-6 pt-4 border-t border-parchment-3 shrink-0">
          <button class="px-4 py-2 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-lg transition-colors" @click="$emit('close')">Cancel</button>
          <button class="px-4 py-2 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!form.name.trim()" @click="submit">Start firing →</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open:        Boolean,
  library:     { type: Array, default: () => [] },
  pastFirings: { type: Array, default: () => [] },
  sensors:     { type: Array, default: () => [] },   // [{ id, name, online }]
})

const emit = defineEmits(['close', 'create'])

// ── Quick-start curve defaults ────────────────────────────────────────────────
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

const quickType         = ref('bisque')
const selectedLibraryId = ref(null)
const selectedPastId    = ref(null)
const appliedLabel      = ref('')
const loadingPast       = ref(false)

const libraryTypes = computed(() => [...new Set(props.library.map(l => l.type))].sort())

function applyQuick(type) {
  quickType.value         = type
  selectedLibraryId.value = null
  selectedPastId.value    = null
  appliedLabel.value      = ''
  form.schedulePoints     = type === 'bisque' ? BISQUE_POINTS.map(p => ({ ...p })) : GLAZE_POINTS.map(p => ({ ...p }))
  if (!form.name.trim()) form.name = type === 'bisque' ? 'Bisque firing' : 'Glaze firing'
}

function applyLibraryById(idStr) {
  const lib = props.library.find(l => String(l.id) === String(idStr))
  if (!lib) return
  selectedLibraryId.value = lib.id
  selectedPastId.value    = null
  quickType.value         = null
  appliedLabel.value      = lib.name + (lib.cone ? ` — Cone ${lib.cone}` : '')
  form.schedulePoints     = lib.points.map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
  if (!form.name.trim()) form.name = lib.name
}

async function loadPastFiring(idStr) {
  if (!idStr) return
  loadingPast.value       = true
  selectedPastId.value    = Number(idStr)
  selectedLibraryId.value = null
  quickType.value         = null
  appliedLabel.value      = ''
  try {
    const data = await $fetch(`/api/firings/${idStr}`)
    if (data.schedule?.length) {
      form.schedulePoints = data.schedule.map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
      appliedLabel.value  = data.name
    } else {
      appliedLabel.value = `${data.name} — no schedule saved`
    }
  } catch {
    appliedLabel.value = 'Could not load firing'
  }
  loadingPast.value = false
}

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

// ── Form ──────────────────────────────────────────────────────────────────────
const form = reactive({
  name:            '',
  notes:           '',
  mode:            'manual',
  schedulePoints:  BISQUE_POINTS.map(p => ({ ...p })),
  selectedSensors: [],
})

watch(() => props.open, (val) => {
  if (val) {
    form.name            = ''
    form.notes           = ''
    form.mode            = 'manual'
    form.schedulePoints  = BISQUE_POINTS.map(p => ({ ...p }))
    form.selectedSensors = []
    quickType.value         = 'bisque'
    selectedLibraryId.value = null
    selectedPastId.value    = null
    appliedLabel.value      = ''
    loadingPast.value       = false
  }
})

function toggleSensor(id) {
  const idx = form.selectedSensors.indexOf(id)
  if (idx === -1) form.selectedSensors.push(id)
  else form.selectedSensors.splice(idx, 1)
}

function submit() {
  if (!form.name.trim()) return
  emit('create', {
    name:           form.name,
    notes:          form.notes,
    schedulePoints: form.schedulePoints,
    mode:           form.mode,
    sensorIds:      form.selectedSensors,
  })
}
</script>