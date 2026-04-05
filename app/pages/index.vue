<template>
  <div class="flex flex-col h-screen">

    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-3 bg-white border-b border-stone-200 shadow-sm">
      <h1 class="text-lg font-semibold flex items-center gap-2">🔥 Kiln.Log</h1>
      <div class="flex items-center gap-3">
        <template v-if="selectedFiring">
          <span class="text-sm font-medium text-stone-700">{{ selectedFiring.name }}</span>
          <span
            v-if="isLive"
            class="px-2 py-0.5 text-xs font-bold rounded-full border cursor-pointer transition-colors"
            :class="isManual
              ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
              : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'"
            @click="toggleMode"
          >
            {{ isManual ? '✏️ Manual' : '📡 Connected' }}
          </span>
          <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ NO SIGNAL</span>
          <span v-else-if="isLive && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200">● LIVE</span>
          <span v-else-if="isLive && isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200">● ACTIVE</span>
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
        @delete="deleteFiring"
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
          :is-manual="isManual"
          :current-temp="currentTemp"
          @open-temp="showTempModal = true"
          @log-reading="openLogReading"
        />

        <!-- Chart -->
        <div class="flex-1 bg-white rounded-xl border border-stone-200 shadow-sm p-5 relative flex items-center justify-center min-h-0">
          <canvas ref="chartCanvas" class="w-full h-full"></canvas>

          <button
            v-if="selectedFiring"
            class="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-sm"
            @click="resetZoom"
          >
            Reset zoom
          </button>

          <div
            v-if="isManual && isLive && !selectedFiring?.readings?.length"
            class="absolute flex flex-col items-center gap-2 text-stone-400 pointer-events-none"
          >
            <svg class="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <p class="text-sm">Use <strong>Log Reading</strong> to record your first temperature</p>
          </div>

          <div v-else-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-stone-400">
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

    <!-- Manual reading modal -->
    <ManualReadingModal
      :open="showReadingModal"
      :started-at="selectedFiring?.started_at ?? 0"
      :is-edit="!!editingReading"
      :edit-temp="editingReading?.y ?? null"
      :edit-ts="editingReading?.ts ?? null"
      @close="closeReadingModal"
      @save="saveReading"
      @delete="deleteReading"
    />

  </div>
</template>

<script setup lang="ts">
import { useKilnChart } from '~/composables/useKilnChart'

const chartCanvas = ref<HTMLCanvasElement | null>(null)

const editingReading   = ref<any>(null)
const showReadingModal = ref(false)

const { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, destroy } = useKilnChart(chartCanvas, {
  onPointClick: (point: any) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value  = point
    showReadingModal.value = true
  },
})

const showStartModal  = ref(false)
const showTempModal   = ref(false)
const allFirings      = ref<any[]>([])
const selectedFiring  = ref<any>(null)
const currentTemp     = ref<number | null>(null)
const isLive          = ref(false)
const isManual        = ref(false)
const signalLost      = ref(false)
const lastReadingTime = ref<number | null>(null)
const library         = ref<any[]>([])

const SIGNAL_TIMEOUT = 30

const sidebarOpen  = ref(true)
const sidebarWidth = ref(280)
const MIN_WIDTH    = 180
const isDragging   = ref(false)

let pollInterval:        ReturnType<typeof setInterval> | null = null
let signalCheckInterval: ReturnType<typeof setInterval> | null = null
let elapsedTickInterval: ReturnType<typeof setInterval> | null = null

const nowUnix = ref(Math.floor(Date.now() / 1000))

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
  const mins = Math.round((nowUnix.value - f.started_at) / 60)
  const h    = Math.floor(mins / 60)
  const m    = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

function stopAllIntervals() {
  if (pollInterval)        { clearInterval(pollInterval);        pollInterval        = null }
  if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null }
  if (elapsedTickInterval) { clearInterval(elapsedTickInterval); elapsedTickInterval = null }
}

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

function openLogReading() {
  editingReading.value  = null
  showReadingModal.value = true
}

function closeReadingModal() {
  showReadingModal.value = false
  editingReading.value  = null
}

async function saveReading(payload: { temperature: number; timestamp: number }) {
  if (!selectedFiring.value) return
  if (editingReading.value) {
    await $fetch(`/api/readings/${editingReading.value.id}`, {
      method: 'PUT',
      body: { temperature: payload.temperature },
    })
  } else {
    await $fetch('/api/readings', {
      method: 'POST',
      body: {
        firingId:    selectedFiring.value.id,
        temperature: payload.temperature,
        timestamp:   payload.timestamp,
      },
    })
  }
  closeReadingModal()
  await reloadReadings()
}

async function deleteReading() {
  if (!editingReading.value) return
  await $fetch(`/api/readings/${editingReading.value.id}`, { method: 'DELETE' })
  closeReadingModal()
  await reloadReadings()
}

async function reloadReadings() {
  if (!selectedFiring.value) return
  const data = await $fetch<any>(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.readings = data.readings
  setReadings(data.readings, selectedFiring.value.started_at)
  if (data.readings?.length) {
    currentTemp.value     = data.readings.at(-1).temperature
    lastReadingTime.value = data.readings.at(-1).timestamp
  }
}

async function toggleMode() {
  if (!selectedFiring.value || !isLive.value) return
  const newMode = isManual.value ? 'connected' : 'manual'
  await $fetch(`/api/firings/${selectedFiring.value.id}`, {
    method: 'PUT',
    body: { mode: newMode },
  })
  selectedFiring.value.mode = newMode
  applyMode(newMode)
}

function applyMode(mode: string) {
  isManual.value = mode === 'manual'
  setManualMode(isManual.value)
  if (isManual.value) {
    if (pollInterval)        { clearInterval(pollInterval);        pollInterval        = null }
    if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null }
    signalLost.value = false
    clearSignalLost()
  } else {
    startPolling()
  }
}

onMounted(async () => {
  console.log('[KilnMonitor] mounted')
  await init()
  await refreshFirings()
  if (activeFiring.value) {
    console.log('[KilnMonitor] auto-selecting active firing on mount:', activeFiring.value.id, activeFiring.value.name)
    await selectFiring(activeFiring.value)
  }
})

onUnmounted(() => {
  console.log('[KilnMonitor] unmounted — clearing all intervals')
  stopAllIntervals()
  destroy()
})

async function refreshFirings() {
  console.log('[KilnMonitor] refreshFirings()')
  allFirings.value = await $fetch<any[]>('/api/firings')
}

async function selectFiring(f: any) {
  console.log('[KilnMonitor] selectFiring()', f.id, f.name)
  stopAllIntervals()
  isLive.value          = false
  isManual.value        = false
  signalLost.value      = false
  currentTemp.value     = null
  lastReadingTime.value = null

  const data = await $fetch<any>(`/api/firings/${f.id}`)
  selectedFiring.value = data

  setSchedule(data.schedule ?? [])
  setReadings(data.readings ?? [], data.started_at)

  if (data.readings?.length) {
    const last = data.readings.at(-1)
    currentTemp.value     = last.temperature
    lastReadingTime.value = last.timestamp
  }

  const isActive = !!(data.started_at && !data.ended_at)

  if (isActive) {
    isLive.value = true
    const mode = data.mode ?? 'connected'
    isManual.value = mode === 'manual'
    setManualMode(isManual.value)

    elapsedTickInterval = setInterval(() => {
      nowUnix.value = Math.floor(Date.now() / 1000)
    }, 1000)

    if (!isManual.value) {
      if (!data.readings?.length) {
        signalLost.value = true
        setSignalLost(data.started_at, null)
      } else {
        const secondsSinceLast = Math.floor(Date.now() / 1000) - lastReadingTime.value!
        if (secondsSinceLast > SIGNAL_TIMEOUT) {
          signalLost.value = true
          setSignalLost(data.started_at, lastReadingTime.value!)
        }
      }
      startPolling()
    }
  } else {
    const mode = data.mode ?? 'connected'
    isManual.value = mode === 'manual'
    setManualMode(isManual.value)
  }
}

async function createFiring(payload: { name: string; notes: string; schedulePoints: any[]; mode: string }) {
  console.log('[KilnMonitor] createFiring()', payload.name, 'mode:', payload.mode)
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

  const fresh = allFirings.value.find(f => f.id === firing.id)
  await selectFiring(fresh ?? firing)
}

async function endFiring() {
  if (!activeFiring.value) return
  const id = activeFiring.value.id

  await $fetch(`/api/firings/${id}`, {
    method: 'PUT',
    body: { endedAt: Math.floor(Date.now() / 1000) },
  })

  stopAllIntervals()
  signalLost.value  = false
  isLive.value      = false
  currentTemp.value = null

  await refreshFirings()

  if (selectedFiring.value?.id === id) {
    const data = await $fetch<any>(`/api/firings/${id}`)
    selectedFiring.value = data
    setSchedule(data.schedule ?? [])
    setReadings(data.readings ?? [], data.started_at)
  }
}

async function deleteFiring(f: any) {
  await $fetch(`/api/firings/${f.id}`, { method: 'DELETE' })
  if (selectedFiring.value?.id === f.id) {
    stopAllIntervals()
    selectedFiring.value = null
    currentTemp.value    = null
    isLive.value         = false
    isManual.value       = false
    signalLost.value     = false
    clearSignalLost()
  }
  await refreshFirings()
}

function startPolling() {
  if (pollInterval)        clearInterval(pollInterval)
  if (signalCheckInterval) clearInterval(signalCheckInterval)

  pollInterval = setInterval(async () => {
    if (!selectedFiring.value || isManual.value) return
    const rows = await $fetch<any[]>(`/api/readings?firingId=${selectedFiring.value.id}`)
    selectedFiring.value.readings = rows
    setReadings(rows, selectedFiring.value.started_at)
    if (rows.length) {
      const last = rows.at(-1)
      currentTemp.value     = last.temperature
      lastReadingTime.value = last.timestamp
      isLive.value          = true
      if (signalLost.value) { signalLost.value = false; clearSignalLost() }
    }
  }, 5000)

  signalCheckInterval = setInterval(() => {
    if (!selectedFiring.value || isManual.value) return
    const now = Math.floor(Date.now() / 1000)
    if (!lastReadingTime.value) {
      if (now - selectedFiring.value.started_at > SIGNAL_TIMEOUT) {
        signalLost.value = true
        setSignalLost(selectedFiring.value.started_at, null)
      }
      return
    }
    if (now - lastReadingTime.value > SIGNAL_TIMEOUT) {
      signalLost.value = true
      setSignalLost(selectedFiring.value.started_at, lastReadingTime.value)
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