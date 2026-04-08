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
            <input v-model="form.name" type="text" placeholder="e.g. Cone 10 wood reduction" class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
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
                :class="form.mode === 'connected' ? 'bg-flame text-parchment' : 'bg-white text-ink-muted hover:bg-parchment-2'"
                @click="form.mode = 'connected'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                ESP32 connected
              </button>
              <button
                class="flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                :class="form.mode === 'manual' ? 'bg-flame text-parchment' : 'bg-white text-ink-muted hover:bg-parchment-2'"
                @click="form.mode = 'manual'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Manual log
              </button>
            </div>
            <p class="text-xs text-ink-muted">
              <template v-if="form.mode === 'connected'">Readings stream automatically from your ESP32 over WiFi.</template>
              <template v-else>You enter temperature readings manually at your own intervals.</template>
            </p>
          </div>

          <!-- Schedule library -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Schedule library</label>
            <p class="text-xs text-ink-muted -mt-1">Pick a preset or build your own below.</p>
            <div class="flex gap-1.5 flex-wrap">
              <button
                v-for="t in libraryTypes" :key="t"
                class="px-2.5 py-1 text-xs rounded-full border transition-colors font-semibold"
                :class="libraryFilter === t ? 'bg-flame border-flame text-parchment' : 'border-parchment-3 text-ink-muted hover:bg-parchment-2'"
                @click="libraryFilter = t"
              >{{ t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) }}</button>
            </div>
            <div class="border border-parchment-3 rounded-xl overflow-hidden divide-y divide-parchment-3 max-h-44 overflow-y-auto bg-white">
              <button
                v-for="lib in filteredLibrary" :key="lib.id"
                class="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-parchment"
                :class="selectedLibraryId === lib.id ? 'bg-flame-bg' : ''"
                @click="applyLibrary(lib)"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-ink">{{ lib.name }}</span>
                    <span v-if="lib.cone" class="px-1.5 py-0.5 text-xs rounded bg-parchment-2 text-ink-faint">Cone {{ lib.cone }}</span>
                  </div>
                  <p v-if="lib.description" class="text-xs text-ink-muted mt-0.5 truncate">{{ lib.description }}</p>
                </div>
                <svg v-if="selectedLibraryId === lib.id" class="w-4 h-4 text-flame shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </button>
              <div v-if="filteredLibrary.length === 0" class="px-4 py-6 text-sm text-ink-muted text-center">No schedules in this category</div>
            </div>
          </div>

          <!-- Schedule waypoints -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Schedule waypoints</label>
            <p class="text-xs text-ink-muted -mt-1">Time is minutes from firing start.</p>
            <div class="grid grid-cols-[1fr_1fr_28px] gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint px-1">
              <span>Time (mins)</span><span>Target °C</span><span></span>
            </div>
            <div v-for="(pt, i) in form.schedulePoints" :key="i" class="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
              <input v-model.number="pt.offsetMinutes" type="number" min="0" placeholder="0" class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
              <input v-model.number="pt.targetTemp" type="number" min="0" max="1400" placeholder="100" class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
              <button class="text-parchment-4 hover:text-red-400 transition-colors text-sm" @click="removePoint(i)">✕</button>
            </div>
            <button class="text-sm text-flame hover:text-flame-dark font-semibold text-left" @click="addPoint">+ Add waypoint</button>
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
  open:    Boolean,
  library: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'create'])

const libraryFilter     = ref('all')
const selectedLibraryId = ref(null)

const libraryTypes = computed(() => {
  const types = [...new Set(props.library.map(l => l.type))]
  return ['all', ...types.sort()]
})

const filteredLibrary = computed(() =>
  libraryFilter.value === 'all' ? props.library : props.library.filter(l => l.type === libraryFilter.value)
)

const defaultPoints = () => [
  { offsetMinutes: 0,   targetTemp: 20   },
  { offsetMinutes: 60,  targetTemp: 200  },
  { offsetMinutes: 180, targetTemp: 600  },
  { offsetMinutes: 360, targetTemp: 1280 },
  { offsetMinutes: 480, targetTemp: 1280 },
  { offsetMinutes: 600, targetTemp: 100  },
]

const form = reactive({
  name:           '',
  notes:          '',
  mode:           'connected',
  schedulePoints: defaultPoints(),
})

watch(() => props.open, (val) => {
  if (val) {
    form.name = form.notes = ''
    form.mode = 'connected'
    form.schedulePoints = defaultPoints()
    selectedLibraryId.value = null
    libraryFilter.value = 'all'
  }
})

function applyLibrary(lib) {
  selectedLibraryId.value = lib.id
  form.schedulePoints = lib.points.map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
  if (!form.name.trim()) form.name = lib.name
}

function addPoint() {
  const last = form.schedulePoints.at(-1)
  form.schedulePoints.push({ offsetMinutes: last ? last.offsetMinutes + 60 : 60, targetTemp: last?.targetTemp ?? 100 })
}

function removePoint(i) { form.schedulePoints.splice(i, 1) }

function submit() {
  if (!form.name.trim()) return
  emit('create', { name: form.name, notes: form.notes, schedulePoints: form.schedulePoints, mode: form.mode })
}
</script>