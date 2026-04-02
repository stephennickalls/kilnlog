<template>
  <div class="flex flex-col h-screen">

    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-3 bg-white border-b border-stone-200 shadow-sm">
      <h1 class="text-lg font-semibold flex items-center gap-2">🔥 Kiln Monitor</h1>
      <div class="flex items-center gap-3">
        <template v-if="selectedFiring">
          <span class="text-sm font-medium text-stone-700">{{ selectedFiring.name }}</span>
          <span v-if="isLive" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200">● LIVE</span>
          <span v-else-if="!selectedFiring.ended_at" class="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">⏳ WAITING</span>
          <span v-else class="px-2 py-0.5 text-xs font-bold rounded-full bg-stone-100 text-stone-500 border border-stone-200">COMPLETE</span>
          <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="btn-danger" @click="endFiring">End Firing</button>
        </template>
      </div>
    </header>

    <!-- Body -->
    <div class="flex flex-1 overflow-hidden">

      <FiringSidebar
        :open="sidebarOpen"
        :width="sidebarWidth"
        :selected-id="selectedFiring?.id ?? null"
        :active-firing="activeFiring"
        :past-firings="pastFirings"
        @toggle="sidebarOpen = !sidebarOpen"
        @select="selectFiring"
        @start="openStartModal"
        @drag="startDrag"
      />

      <!-- Chart area -->
      <main class="flex-1 p-5 flex flex-col min-w-0 overflow-hidden gap-4">

        <!-- Stats bar -->
        <FiringStatsBar
          v-if="selectedFiring"
          :peak-temp="peakTemp"
          :duration="duration"
          :rate-of-change="rateOfChange"
          :elapsed="elapsed"
          :reading-count="readingCount"
          :notes="selectedFiring.notes"
          :is-live="isLive"
          :current-temp="currentTemp"
          @open-temp="showTempModal = true"
        />

        <!-- Chart -->
        <div class="flex-1 bg-white rounded-xl border border-stone-200 shadow-sm p-5 relative flex items-center justify-center min-h-0">
          <canvas ref="chartCanvas" class="w-full h-full"></canvas>
          <div v-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-stone-400">
            <p class="text-sm">Select a firing from the sidebar or start a new one</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Temp modal -->
    <KilnTempModal
      :open="showTempModal"
      :temp="currentTemp"
      :peak-temp="peakTemp"
      :rate-of-change="rateOfChange"
      :elapsed="elapsed"
      :is-live="isLive"
      :firing-name="selectedFiring?.name"
      @close="showTempModal = false"
    />

    <!-- Start firing modal -->
    <StartFiringModal
      :open="showStartModal"
      :library="library"
      @close="showStartModal = false"
      @create="createFiring"
    />

  </div>
</template>

<script setup lang="ts">
import { useKilnChart } from '~/composables/useKilnChart'

const chartCanvas = ref<HTMLCanvasElement | null>(null)
const { init, setSchedule, setReadings, destroy } = useKilnChart(chartCanvas)

const showStartModal = ref(false)
const showTempModal  = ref(false)
const allFirings     = ref<any[]>([])
const selectedFiring = ref<any>(null)
const currentTemp    = ref<number | null>(null)
const isLive         = ref(false)
const library        = ref<any[]>([])

const sidebarOpen  = ref(true)
const sidebarWidth = ref(280)
const MIN_WIDTH    = 180
const isDragging   = ref(false)

let pollInterval: ReturnType<typeof setInterval> | null = null

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))

const peakTemp = computed(() => {
  if (!selectedFiring.value?.readings?.length) return null
  return Math.max(...selectedFiring.value.readings.map((r: any) => r.temperature))
})

const duration = computed(() => {
  const f = selectedFiring.value
  if (!f?.started_at || !f?.ended_at) return null
  const mins = Math.round((f.ended_at - f.started_at) / 60)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const readingCount = computed(() => selectedFiring.value?.readings?.length ?? 0)

const rateOfChange = computed(() => {
  const readings = selectedFiring.value?.readings
  if (!readings || readings.length < 6) return '—'
  const recent    = readings.slice(-6)
  const deltaTemp = recent[recent.length - 1].temperature - recent[0].temperature
  const deltaMins = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 60
  if (deltaMins === 0) return '—'
  const rate = Math.round(deltaTemp / deltaMins)
  return rate >= 0 ? `+${rate}°C/min` : `${rate}°C/min`
})

const elapsed = computed(() => {
  const f = selectedFiring.value
  if (!f?.started_at) return '—'
  const now  = Math.floor(Date.now() / 1000)
  const mins = Math.round((now - f.started_at) / 60)
  const h    = Math.floor(mins / 60)
  const m    = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

function startDrag(e: MouseEvent) {
  isDragging.value = true
  const startX     = e.clientX
  const startWidth = sidebarWidth.value
  const maxWidth   = () => Math.floor(window.innerWidth / 3)

  function onMove(e: MouseEvent) {
    const delta    = e.clientX - startX
    const newWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), maxWidth())
    sidebarWidth.value = newWidth
  }

  function onUp() {
    isDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.cursor     = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor     = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

async function openStartModal() {
  if (!library.value.length) {
    library.value = await $fetch<any[]>('/api/library')
  }
  showStartModal.value = true
}

onMounted(async () => {
  init()
  await refreshFirings()
  if (activeFiring.value) await selectFiring(activeFiring.value)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  destroy()
})

async function refreshFirings() {
  allFirings.value = await $fetch<any[]>('/api/firings')
}

async function selectFiring(f: any) {
  if (pollInterval) clearInterval(pollInterval)
  isLive.value      = false
  currentTemp.value = null

  const data = await $fetch<any>(`/api/firings/${f.id}`)
  selectedFiring.value = data

  setSchedule(data.schedule ?? [])
  setReadings(data.readings ?? [], data.started_at)

  if (data.readings?.length) {
    currentTemp.value = data.readings.at(-1).temperature
  }

  if (data.started_at && !data.ended_at) {
    isLive.value = true
    startPolling()
  }
}

async function createFiring(payload: { name: string; notes: string; schedulePoints: any[] }) {
  const firing = await $fetch<any>('/api/firings', {
    method: 'POST',
    body: payload,
  })
  await $fetch(`/api/firings/${firing.id}`, {
    method: 'PUT',
    body: { startedAt: Math.floor(Date.now() / 1000) },
  })
  showStartModal.value = false
  await refreshFirings()
  await selectFiring(firing)
}

async function endFiring() {
  if (!activeFiring.value) return
  await $fetch(`/api/firings/${activeFiring.value.id}`, {
    method: 'PUT',
    body: { endedAt: Math.floor(Date.now() / 1000) },
  })
  if (pollInterval) clearInterval(pollInterval)
  isLive.value      = false
  currentTemp.value = null
  await refreshFirings()
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(async () => {
    if (!selectedFiring.value) return
    const rows = await $fetch<any[]>(`/api/readings?firingId=${selectedFiring.value.id}`)
    selectedFiring.value.readings = rows
    setReadings(rows, selectedFiring.value.started_at)
    if (rows.length) {
      currentTemp.value = rows.at(-1).temperature
      isLive.value      = true
    }
  }, 5000)
}
</script>

<style>
.btn-primary { @apply px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed; }
.btn-danger  { @apply px-4 py-1.5 border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors; }
.btn-ghost   { @apply px-4 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors; }
.input       { @apply w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300; }
.label       { @apply text-xs font-semibold uppercase tracking-wide text-stone-400; }
.stat-pill   { @apply flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-1.5; }
.stat-label  { @apply text-xs text-stone-400 uppercase tracking-wide; }
.stat-value  { @apply text-sm font-semibold text-stone-700; }
</style>