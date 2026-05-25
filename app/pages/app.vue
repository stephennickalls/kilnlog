<!-- app/pages/app.vue -->
<template>
  <div class="flex flex-col h-screen overflow-hidden font-serif bg-parchment">

    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <header class="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-parchment border-b border-parchment-3">
      <div class="flex items-center gap-2">
        <button class="sm:hidden p-1.5 -ml-1 rounded-lg text-ink-muted" @click="showFiringSheet = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <NuxtLink to="/account" class="text-base sm:text-lg font-bold flex items-center gap-2 text-ink tracking-tight hover:text-flame transition-colors">🔥 KilnMonitor</NuxtLink>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <template v-if="selectedFiring">
          <span class="text-xs sm:text-sm font-semibold text-ink truncate max-w-[90px] sm:max-w-none">{{ selectedFiring.name }}</span>
          <span v-if="isLive" class="hidden sm:inline-flex px-2 py-0.5 text-xs font-bold rounded-full border cursor-pointer transition-colors"
            :class="isManual ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-parchment-3 bg-parchment-2 text-ink-muted'"
            @click="toggleMode">{{ isManual ? 'Manual' : 'Connected' }}</span>
          <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shrink-0">⚠️</span>
          <span v-else-if="isLive && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">● LIVE</span>
          <span v-else-if="isLive && isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">● ACTIVE</span>
          <span v-else-if="!selectedFiring.ended_at" class="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">⏳</span>
          <span v-else class="px-2 py-0.5 text-xs font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3 shrink-0">DONE</span>
          <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="btn-danger !px-2 !py-1 !text-xs shrink-0" @click="endFiring">End</button>
        </template>
      </div>
    </header>

    <!-- ── Body ─────────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Sidebar — desktop only -->
      <FiringSidebar
        class="hidden sm:flex"
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

      <!-- Main content -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Desktop stats bar -->
        <div class="hidden sm:block p-5 pb-0">
          <FiringStatsBar
            v-if="selectedFiring"
            :peak-temp="peakTemp"
            :duration="duration"
            :rate-of-change="rateOfChange"
            :target-rate="targetRate"
            :elapsed="elapsed"
            :reading-count="readingCount"
            :notes="selectedFiring.notes"
            :is-live="isLive"
            :is-manual="isManual"
            :current-temp="currentTemp"
            @open-temp="showTempModal = true"
            @log-reading="openLogReading"
          />
        </div>

        <!-- Desktop chart -->
        <div class="hidden sm:flex flex-1 bg-white rounded-xl border border-parchment-3 relative items-center justify-center min-h-0 sm:m-5 sm:mt-4" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <canvas ref="chartCanvas" class="w-full h-full"></canvas>
          <button v-if="selectedFiring" class="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium border border-parchment-3 rounded-lg bg-white text-ink-muted hover:bg-parchment transition-colors" @click="resetZoom">Reset zoom</button>
          <div v-if="isManual && isLive && !selectedFiring?.readings?.length" class="absolute flex flex-col items-center gap-2 text-ink-muted pointer-events-none">
            <p class="text-sm">Use <strong>Log Reading</strong> to record your first temperature</p>
          </div>
          <div v-else-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-ink-muted">
            <p class="text-sm">Select a firing from the sidebar or start a new one</p>
          </div>
        </div>

        <!-- Mobile view -->
        <div class="flex flex-col flex-1 sm:hidden overflow-hidden">

          <!-- No firing -->
          <div v-if="!selectedFiring" class="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p class="text-ink-muted text-sm">No firing selected</p>
            <button class="btn-primary px-6 py-3" @click="openStartModal">+ Start firing</button>
            <button class="text-sm text-flame" @click="showFiringSheet = true">View past firings</button>
          </div>

          <!-- Firing selected -->
          <template v-else>
            <!-- Compact stats row -->
            <div class="shrink-0 px-2 pt-2 flex gap-1.5">
              <button class="flex-1 bg-white border border-parchment-3 rounded-lg py-1.5 px-2 flex flex-col items-center active:bg-flame-bg" @click="showTempModal = true">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-0.5">Now</span>
                <span class="text-xl font-bold tabular-nums leading-none" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-4'">{{ currentTemp !== null ? Math.round(currentTemp) : '—' }}</span>
                <span class="text-[10px] text-flame-light">°C</span>
              </button>
              <div class="flex-1 bg-white border border-parchment-3 rounded-lg py-1.5 px-2 flex flex-col items-center">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-0.5">Peak</span>
                <span class="text-xl font-bold tabular-nums leading-none text-ink">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}</span>
                <span class="text-[10px] text-ink-faint">°C</span>
              </div>
              <div class="flex-1 bg-white border border-parchment-3 rounded-lg py-1.5 px-2 flex flex-col items-center">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-0.5">{{ isLive && !isManual ? 'Elapsed' : 'Readings' }}</span>
                <span class="text-xl font-bold tabular-nums leading-none text-ink">{{ isLive && !isManual ? elapsed : readingCount }}</span>
                <span class="text-[10px] text-ink-faint">{{ isLive && !isManual ? '' : 'pts' }}</span>
              </div>
              <div class="flex-1 bg-white border border-parchment-3 rounded-lg py-1.5 px-2 flex flex-col items-center">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-0.5">Rate</span>
                <span class="text-base font-bold tabular-nums leading-none text-ink">{{ rateOfChange }}</span>
                <span class="text-[10px] text-ink-faint">°/m</span>
              </div>
            </div>

            <!-- Mobile chart -->
            <div class="flex-1 relative min-h-0 px-2 py-2 flex items-stretch">
              <div class="flex-1 bg-white rounded-xl border border-parchment-3 relative" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
                <canvas ref="chartCanvasMobile" class="w-full h-full"></canvas>
                <div v-if="!selectedFiring?.readings?.length && !isManual" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p class="text-xs text-ink-muted text-center px-4">Waiting for sensor data…</p>
                </div>
                <button class="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white border border-parchment-3 text-ink-muted" @click="resetZoomMobile">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/></svg>
                </button>
              </div>
            </div>

            <!-- Mobile action row -->
            <div class="shrink-0 flex gap-2 px-2 pb-3 pt-1">
              <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="btn-danger flex-1 py-3 !text-sm" @click="endFiring">End firing</button>
              <button v-if="isLive && isManual" class="btn-primary flex-1 py-3" @click="openLogReading">+ Log reading</button>
              <button v-if="isLive" class="flex-1 py-3 border text-xs font-bold rounded-lg transition-colors"
                :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-parchment-3 bg-parchment-2 text-ink-muted'"
                @click="toggleMode">{{ isManual ? 'Manual' : 'Connected' }}</button>
              <button v-if="!isLive && !activeFiring && selectedFiring?.started_at && selectedFiring?.ended_at" class="flex-1 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg active:bg-amber-600 transition-colors" @click="restartFiring(selectedFiring)">↺ Restart firing</button>
              <button v-else-if="!isLive && !activeFiring" class="flex-1 py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openStartModal">+ Start firing</button>
            </div>
          </template>
        </div>
      </main>
    </div>

    <!-- ── Mobile firing sheet ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showFiringSheet" class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden" style="background:rgba(26,18,8,0.6)" @click.self="showFiringSheet = false">
        <div class="bg-parchment rounded-t-2xl flex flex-col" style="max-height:80vh">
          <div class="flex justify-center pt-3 pb-1 shrink-0"><div class="w-10 h-1 bg-parchment-3 rounded-full"></div></div>
          <div class="flex items-center justify-between px-4 py-2 border-b border-parchment-3 shrink-0">
            <h2 class="text-sm font-bold text-ink">Firings</h2>
            <button class="p-1 text-ink-muted" @click="showFiringSheet = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <ul class="overflow-y-auto flex-1 divide-y divide-parchment-3">
            <li v-if="activeFiring">
              <button class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 transition-colors" :class="selectedFiring?.id === activeFiring.id ? 'bg-flame-bg border-l-2 border-flame' : ''" @click="selectFiring(activeFiring); showFiringSheet = false">
                <div class="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-ink truncate">{{ activeFiring.name }}</p>
                  <p class="text-xs text-green-600 mt-0.5 font-semibold">Live</p>
                </div>
                <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </li>
            <li v-if="!pastFirings.length && !activeFiring" class="px-4 py-8 text-sm text-ink-muted text-center">No firings yet</li>
            <li v-for="f in pastFirings" :key="f.id" class="relative">
              <button class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 pr-16 transition-colors" :class="selectedFiring?.id === f.id ? 'bg-flame-bg border-l-2 border-flame' : ''" @click="selectFiring(f); showFiringSheet = false">
                <div class="w-2 h-2 rounded-full bg-parchment-4 shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">{{ f.name }}</p>
                  <p class="text-xs text-ink-muted mt-0.5">{{ formatDate(f.created_at) }}</p>
                </div>
              </button>
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <button v-if="sheetConfirmDeleteId !== f.id" class="p-2 text-parchment-4 hover:text-red-400" @click.stop="sheetConfirmDeleteId = f.id">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
                <button v-else class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500" @click.stop="sheetDeleteFiring(f)">Delete?</button>
              </div>
            </li>
          </ul>
          <div class="p-3 border-t border-parchment-3 shrink-0">
            <button class="btn-primary w-full py-3" @click="openStartModal(); showFiringSheet = false">+ Start firing</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modals ────────────────────────────────────────────────────────────── -->
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

    <StartFiringModal
      :open="showStartModal"
      :library="library"
      :sensors="sensors"
      @close="showStartModal = false"
      @create="createFiring"
    />

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

<script setup>
// app/pages/app.vue
import { useKilnChart } from '~/composables/useKilnChart'

definePageMeta({ middleware: ['auth'] })

// ── Refs ───────────────────────────────────────────────────────────────────────
const chartCanvas          = ref(null)
const chartCanvasMobile    = ref(null)
const editingReading       = ref(null)
const showReadingModal     = ref(false)
const showFiringSheet      = ref(false)
const sheetConfirmDeleteId = ref(null)
const showStartModal       = ref(false)
const showTempModal        = ref(false)
const allFirings           = ref([])
const selectedFiring       = ref(null)
const currentTemp          = ref(null)
const isSaving             = ref(false)
const isLive               = ref(false)
const isManual             = ref(false)
const signalLost           = ref(false)
const lastReadingTime      = ref(null)
const library              = ref([])
const sensors              = ref([])
const showSensorPanel      = ref(false)
const sidebarOpen          = ref(true)
const sidebarWidth         = ref(280)
const MIN_WIDTH            = 180
const isDragging           = ref(false)
const nowUnix              = ref(Math.floor(Date.now() / 1000))

// ── Constants ──────────────────────────────────────────────────────────────────
const SIGNAL_TIMEOUT = 30
const ONLINE_TIMEOUT = 30
const EMA_ALPHA      = 0.3

// ── Intervals (non-reactive) ───────────────────────────────────────────────────
let signalCheckInterval = null
let elapsedTickInterval = null
let sensorPollInterval  = null

// ── Composables ────────────────────────────────────────────────────────────────
const realtime = useFiringRealtime()

const { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  showLabels: true,
  onPointClick: (point) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, y: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const { init: initMobile, setSchedule: setScheduleMobile, setReadings: setReadingsMobile, resetZoom: resetZoomMobile, destroy: destroyMobile } = useKilnChart(chartCanvasMobile, { enableZoom: true, showLabels: true })

// ── Computed ───────────────────────────────────────────────────────────────────
const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))
const peakTemp     = computed(() => { if (!selectedFiring.value?.readings?.length) return null; return Math.max(...selectedFiring.value.readings.map(r => r.temperature)) })
const duration     = computed(() => { const f = selectedFiring.value; if (!f?.started_at || !f?.ended_at) return null; const mins = Math.round((f.ended_at - f.started_at) / 60), h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m` })
const readingCount = computed(() => selectedFiring.value?.readings?.length ?? 0)
const elapsed      = computed(() => { const f = selectedFiring.value; if (!f?.started_at) return '—'; const mins = Math.round((nowUnix.value - f.started_at) / 60), h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m` })

const rateOfChange = computed(() => {
  const readings = selectedFiring.value?.readings
  if (!readings || readings.length < 2) return '—'
  let ema = null
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1], curr = readings[i]
    const deltaMins = (curr.timestamp - prev.timestamp) / 60
    if (deltaMins < 0.5) continue
    const instantRate = (curr.temperature - prev.temperature) / deltaMins
    ema = ema === null ? instantRate : EMA_ALPHA * instantRate + (1 - EMA_ALPHA) * ema
  }
  if (ema === null) return '—'
  const rate = Math.round(ema)
  return rate >= 0 ? `+${rate}°/m` : `${rate}°/m`
})

const targetRate = computed(() => {
  const f = selectedFiring.value
  if (!f?.started_at || !f?.schedule?.length) return '—'
  const elapsedMins = (nowUnix.value - f.started_at) / 60
  const schedule    = [...f.schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)
  let before = null, after = null
  for (let i = 0; i < schedule.length - 1; i++) {
    if (schedule[i].offset_minutes <= elapsedMins && schedule[i + 1].offset_minutes >= elapsedMins) {
      before = schedule[i]; after = schedule[i + 1]; break
    }
  }
  if (!before || !after) return '—'
  const deltaTemp = after.target_temp - before.target_temp
  const deltaMins = after.offset_minutes - before.offset_minutes
  if (deltaMins === 0) return '—'
  const rate = Math.round(deltaTemp / deltaMins)
  return rate >= 0 ? `+${rate}°/m` : `${rate}°/m`
})

const assignedSensors = computed(() => {
  const rows = selectedFiring.value?.sensors ?? []
  return rows.map(r => {
    const id   = r.sensors?.id   ?? r.sensor_id
    const name = r.sensors?.name ?? r.sensor_id
    const meta = sensors.value.find(s => s.id === id)
    return { ...r, id, name, online: meta?.online ?? false }
  })
})

const unassignedSensors = computed(() => {
  const assignedIds = new Set(assignedSensors.value.map(s => s.sensor_id ?? s.id))
  return sensors.value.filter(s => !assignedIds.has(s.id))
})

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await init()
  await refreshFirings()
  if (activeFiring.value) await selectFiring(activeFiring.value)
  await refreshSensors()
  startSensorPolling()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopAllIntervals()
  if (sensorPollInterval) clearInterval(sensorPollInterval)
  destroy()
  destroyMobile()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stopAllIntervals() {
  realtime.unsubscribe()
  if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null }
  if (elapsedTickInterval) { clearInterval(elapsedTickInterval); elapsedTickInterval = null }
}

function startDrag(e) {
  isDragging.value = true
  const startX = e.clientX, startWidth = sidebarWidth.value, maxWidth = () => Math.floor(window.innerWidth / 3)
  function onMove(e) { sidebarWidth.value = Math.min(Math.max(startWidth + e.clientX - startX, MIN_WIDTH), maxWidth()) }
  function onUp() { isDragging.value = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = document.body.style.userSelect = '' }
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
}

// ── Realtime subscription (replaces poll) ──────────────────────────────────────
function startPolling() {
  if (signalCheckInterval) clearInterval(signalCheckInterval)
  if (!selectedFiring.value) return

  const firingId = selectedFiring.value.id

  realtime.subscribe(firingId, (reading) => {
    if (!selectedFiring.value || selectedFiring.value.id !== firingId) return
    if (isManual.value) return

    const existing = selectedFiring.value.readings ?? []

    // Guard against duplicate deliveries
    if (existing.some(r => r.id === reading.id)) return

    const merged = existing.concat(reading)
    selectedFiring.value.readings = merged
    setReadings(merged, selectedFiring.value.started_at)
    setReadingsMobile(merged, selectedFiring.value.started_at)

    if (!isSaving.value) {
      currentTemp.value     = reading.temperature
      lastReadingTime.value = reading.timestamp
      isLive.value          = true
      if (signalLost.value) { signalLost.value = false; clearSignalLost() }
    }
  })

  // Signal-lost watchdog — still a local timer
  signalCheckInterval = setInterval(() => {
    if (!selectedFiring.value || isManual.value) return
    const now = Math.floor(Date.now() / 1000)
    if (!lastReadingTime.value) {
      if (now - selectedFiring.value.started_at > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(selectedFiring.value.started_at, null) }
      return
    }
    if (now - lastReadingTime.value > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(selectedFiring.value.started_at, lastReadingTime.value) }
  }, 5000)
}

// ── Sensors ────────────────────────────────────────────────────────────────────
async function refreshSensors() {
  const now = Math.floor(Date.now() / 1000)
  const raw = await $fetch('/api/sensors')
  sensors.value = raw.map(s => ({ ...s, online: !!s.last_seen && (now - s.last_seen) <= ONLINE_TIMEOUT }))
}

function startSensorPolling() {
  if (sensorPollInterval) clearInterval(sensorPollInterval)
  sensorPollInterval = setInterval(refreshSensors, 15000)
}

// ── Visibility ─────────────────────────────────────────────────────────────────
async function onVisibilityChange() {
  if (document.hidden) return
  if (!selectedFiring.value) return
  await reloadReadings()
  if (isLive.value && !isManual.value) startPolling()
  if (isLive.value && !elapsedTickInterval) {
    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
  }
}

// ── Data ───────────────────────────────────────────────────────────────────────
async function refreshFirings() {
  allFirings.value = await $fetch('/api/firings')
}

async function selectFiring(f) {
  stopAllIntervals()
  isLive.value = isManual.value = signalLost.value = false
  currentTemp.value = lastReadingTime.value = null
  showSensorPanel.value = false

  const data = await $fetch(`/api/firings/${f.id}`)
  selectedFiring.value = data
  setSchedule(data.schedule ?? [])
  setReadings(data.readings ?? [], data.started_at)
  await nextTick(); await initMobile()
  setScheduleMobile(data.schedule ?? [])
  setReadingsMobile(data.readings ?? [], data.started_at)

  if (data.readings?.length) {
    const last = data.readings.at(-1)
    currentTemp.value     = last.temperature
    lastReadingTime.value = last.timestamp
  }

  const isActive = !!(data.started_at && !data.ended_at)
  const mode = data.mode ?? 'connected'
  isManual.value = mode === 'manual'
  setManualMode(isManual.value)

  if (isActive) {
    isLive.value = true
    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
    if (!isManual.value) {
      if (!data.readings?.length) { signalLost.value = true; setSignalLost(data.started_at, null) }
      else { const secs = Math.floor(Date.now() / 1000) - lastReadingTime.value; if (secs > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(data.started_at, lastReadingTime.value) } }
      startPolling()
    }
  }
}

async function createFiring(payload) {
  const firing = await $fetch('/api/firings', { method: 'POST', body: payload })
  await $fetch(`/api/firings/${firing.id}`, { method: 'PUT', body: { startedAt: Math.floor(Date.now() / 1000) } })
  showStartModal.value = false
  await refreshFirings()
  const fresh = allFirings.value.find(f => f.id === firing.id)
  await selectFiring(fresh ?? firing)
}

async function endFiring() {
  if (!activeFiring.value) return
  const id = activeFiring.value.id
  await $fetch(`/api/firings/${id}`, { method: 'PUT', body: { endedAt: Math.floor(Date.now() / 1000) } })
  stopAllIntervals()
  signalLost.value = isLive.value = false
  currentTemp.value = null
  await refreshFirings()
  if (selectedFiring.value?.id === id) {
    const data = await $fetch(`/api/firings/${id}`)
    selectedFiring.value = data
    setSchedule(data.schedule ?? [])
    setReadings(data.readings ?? [], data.started_at)
    setScheduleMobile(data.schedule ?? [])
    setReadingsMobile(data.readings ?? [], data.started_at)
  }
}

async function restartFiring(f) {
  if (!f?.started_at || !f?.ended_at || activeFiring.value) return
  await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { endedAt: null } })
  await refreshFirings()
  const fresh = allFirings.value.find(fi => fi.id === f.id)
  await selectFiring(fresh ?? f)
}

async function deleteFiring(f) {
  await $fetch(`/api/firings/${f.id}`, { method: 'DELETE' })
  if (selectedFiring.value?.id === f.id) {
    stopAllIntervals()
    selectedFiring.value = currentTemp.value = null
    isLive.value = isManual.value = signalLost.value = false
    clearSignalLost()
  }
  await refreshFirings()
}

async function addSensorToFiring(sensorId) {
  if (!selectedFiring.value) return
  await $fetch(`/api/firings/${selectedFiring.value.id}/sensors`, { method: 'POST', body: { sensorId } })
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.sensors = data.sensors
}

async function removeSensorFromFiring(sensorId) {
  if (!selectedFiring.value) return
  await $fetch(`/api/firings/${selectedFiring.value.id}/sensors/${sensorId}`, { method: 'DELETE' })
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.sensors = data.sensors
}

// ── Modals / reading ───────────────────────────────────────────────────────────
async function openStartModal() {
  if (!library.value.length) library.value = await $fetch('/api/library')
  await refreshSensors()
  showStartModal.value = true
}

function openLogReading()    { editingReading.value = null; showReadingModal.value = true }
function closeReadingModal() { showReadingModal.value = false; editingReading.value = null }

async function saveReading(payload) {
  if (!selectedFiring.value) return
  isSaving.value = true
  try {
    if (editingReading.value) {
      const id = editingReading.value.id ?? editingReading.value.raw?.id
      await $fetch(`/api/readings/${id}`, { method: 'PUT', body: { temperature: payload.temperature } })
    } else {
      await $fetch('/api/readings', {
        method: 'POST',
        body: { firingId: selectedFiring.value.id, temperature: payload.temperature, timestamp: payload.timestamp },
      })
      currentTemp.value     = payload.temperature
      lastReadingTime.value = payload.timestamp
    }
    closeReadingModal()
    await reloadReadings()
  } catch (err) {
    console.error('Failed to save reading:', err)
    alert(`Failed to save: ${err?.data?.message ?? err.message ?? 'Unknown error'}`)
  } finally {
    isSaving.value = false
  }
}

async function deleteReading() {
  if (!editingReading.value) return
  try {
    const id = editingReading.value.id ?? editingReading.value.raw?.id
    await $fetch(`/api/readings/${id}`, { method: 'DELETE' })
    closeReadingModal()
    await reloadReadings()
  } catch (err) {
    console.error('Failed to delete reading:', err)
    alert(`Failed to delete: ${err?.data?.message ?? err.message ?? 'Unknown error'}`)
  }
}

async function reloadReadings() {
  if (!selectedFiring.value) return
  try {
    const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
    selectedFiring.value.readings = data.readings
    setReadings(data.readings, selectedFiring.value.started_at)
    setReadingsMobile(data.readings, selectedFiring.value.started_at)
    if (!isSaving.value && data.readings?.length) {
      currentTemp.value     = data.readings.at(-1).temperature
      lastReadingTime.value = data.readings.at(-1).timestamp
    }
  } catch (err) {
    console.error('Failed to reload readings:', err)
  }
}

// ── Mode ───────────────────────────────────────────────────────────────────────
async function toggleMode() {
  if (!selectedFiring.value || !isLive.value) return
  const newMode = isManual.value ? 'connected' : 'manual'
  await $fetch(`/api/firings/${selectedFiring.value.id}`, { method: 'PUT', body: { mode: newMode } })
  selectedFiring.value.mode = newMode
  applyMode(newMode)
}

function applyMode(mode) {
  isManual.value = mode === 'manual'
  setManualMode(isManual.value)
  if (isManual.value) {
    realtime.unsubscribe()
    if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null }
    signalLost.value = false
    clearSignalLost()
  } else {
    startPolling()
  }
}

async function sheetDeleteFiring(f) {
  sheetConfirmDeleteId.value = null
  showFiringSheet.value = false
  await deleteFiring(f)
}
</script>

<style>
.btn-primary { @apply px-4 py-1.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed; }
.btn-danger  { @apply px-4 py-1.5 border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors; }
.btn-ghost   { @apply px-4 py-1.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-medium rounded-lg transition-colors; }
.input       { @apply w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-flame/20 focus:border-flame font-serif; }
.label       { @apply text-xs font-bold uppercase tracking-widest text-ink-faint; }
</style>