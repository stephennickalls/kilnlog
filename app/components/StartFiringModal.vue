<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="$emit('close')">
      <div class="bg-white rounded-xl shadow-xl w-[560px] max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-5">
        <h2 class="text-lg font-semibold">Start Firing</h2>

        <div class="flex flex-col gap-1">
          <label class="label">Name</label>
          <input v-model="form.name" class="input" type="text" placeholder="e.g. Cone 8 wood/gas hybrid" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="label">Notes <span class="text-stone-300 font-normal">(optional)</span></label>
          <textarea v-model="form.notes" class="input resize-none" placeholder="Clay body, glazes, weather..." rows="2" />
        </div>

        <!-- Library picker -->
        <div class="flex flex-col gap-2">
          <label class="label">Schedule Library</label>
          <p class="text-xs text-stone-400 -mt-1">Pick a preset to populate the schedule below, or build your own.</p>

          <div class="flex gap-1 flex-wrap">
            <button
              v-for="t in libraryTypes"
              :key="t"
              class="px-2.5 py-1 text-xs rounded-full border transition-colors"
              :class="libraryFilter === t
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-stone-200 text-stone-500 hover:bg-stone-50'"
              @click="libraryFilter = t"
            >
              {{ t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) }}
            </button>
          </div>

          <div class="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 max-h-48 overflow-y-auto">
            <button
              v-for="lib in filteredLibrary"
              :key="lib.id"
              class="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
              :class="selectedLibraryId === lib.id ? 'bg-orange-50' : ''"
              @click="applyLibrary(lib)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-stone-700">{{ lib.name }}</span>
                  <span v-if="lib.cone" class="px-1.5 py-0.5 text-xs rounded bg-stone-100 text-stone-500">Cone {{ lib.cone }}</span>
                </div>
                <p v-if="lib.description" class="text-xs text-stone-400 mt-0.5 truncate">{{ lib.description }}</p>
              </div>
              <svg v-if="selectedLibraryId === lib.id" class="w-4 h-4 text-orange-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
            <div v-if="filteredLibrary.length === 0" class="px-3 py-4 text-sm text-stone-400 text-center">
              No schedules in this category
            </div>
          </div>
        </div>

        <!-- Waypoints -->
        <div class="flex flex-col gap-2">
          <label class="label">Schedule Waypoints</label>
          <p class="text-xs text-stone-400 -mt-1">Time is minutes from firing start.</p>
          <div class="grid grid-cols-[1fr_1fr_28px] gap-2 text-xs text-stone-400 px-1">
            <span>Time (mins)</span>
            <span>Target °C</span>
            <span></span>
          </div>
          <div v-for="(pt, i) in form.schedulePoints" :key="i" class="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
            <input v-model.number="pt.offsetMinutes" class="input" type="number" min="0" placeholder="0" />
            <input v-model.number="pt.targetTemp" class="input" type="number" min="0" max="1400" placeholder="100" />
            <button class="text-stone-300 hover:text-red-400 transition-colors text-sm" @click="removePoint(i)">✕</button>
          </div>
        </div>

        <button class="text-sm text-orange-500 hover:text-orange-600 text-left" @click="addPoint">+ Add waypoint</button>

        <div class="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button class="btn-ghost" @click="$emit('close')">Cancel</button>
          <button class="btn-primary" :disabled="!form.name.trim()" @click="submit">Start Firing →</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open:    boolean
  library: any[]
}>()

const emit = defineEmits<{
  close:  []
  create: [payload: { name: string; notes: string; schedulePoints: any[] }]
}>()

const libraryFilter     = ref('all')
const selectedLibraryId = ref<number | null>(null)

const libraryTypes = computed(() => {
  const types = [...new Set(props.library.map((l: any) => l.type))]
  return ['all', ...types.sort()]
})

const filteredLibrary = computed(() =>
  libraryFilter.value === 'all'
    ? props.library
    : props.library.filter((l: any) => l.type === libraryFilter.value)
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
  schedulePoints: defaultPoints() as { offsetMinutes: number; targetTemp: number }[],
})

// Reset form when modal opens
watch(() => props.open, (val) => {
  if (val) {
    form.name           = ''
    form.notes          = ''
    form.schedulePoints = defaultPoints()
    selectedLibraryId.value = null
    libraryFilter.value     = 'all'
  }
})

function applyLibrary(lib: any) {
  selectedLibraryId.value = lib.id
  form.schedulePoints = lib.points.map((p: any) => ({
    offsetMinutes: p.offset_minutes,
    targetTemp:    p.target_temp,
  }))
  if (!form.name.trim()) form.name = lib.name
}

function addPoint() {
  const last = form.schedulePoints.at(-1)
  form.schedulePoints.push({ offsetMinutes: last ? last.offsetMinutes + 60 : 60, targetTemp: last?.targetTemp ?? 100 })
}

function removePoint(i: number) { form.schedulePoints.splice(i, 1) }

function submit() {
  if (!form.name.trim()) return
  emit('create', { name: form.name, notes: form.notes, schedulePoints: form.schedulePoints })
}
</script>