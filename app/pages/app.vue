<template>
  <div class="flex flex-col h-screen overflow-hidden">

    <!-- Header -->
    <header class="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-stone-200 shadow-sm">
      <div class="flex items-center gap-2">
        <button class="sm:hidden p-1.5 -ml-1 rounded-lg text-stone-400" @click="showFiringSheet = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 class="text-base sm:text-lg font-semibold flex items-center gap-2">🔥 Kiln.Log</h1>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <template v-if="selectedFiring">
          <span class="text-xs sm:text-sm font-medium text-stone-700 truncate max-w-[90px] sm:max-w-none">{{ selectedFiring.name }}</span>
          <span
            v-if="isLive"
            class="hidden sm:inline-flex px-2 py-0.5 text-xs font-bold rounded-full border cursor-pointer"
            :class="isManual ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-stone-50 text-stone-500 border-stone-200'"
            @click="toggleMode"
          >{{ isManual ? '✏️ Manual' : '📡 Connected' }}</span>
          <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shrink-0">⚠️</span>
          <span v-else-if="isLive && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">● LIVE</span>
          <span v-else-if="isLive && isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">● ACTIVE</span>
          <span v-else-if="!selectedFiring.ended_at" class="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">⏳</span>
          <span v-else class="px-2 py-0.5 text-xs font-bold rounded-full bg-stone-100 text-stone-500 border border-stone-200 shrink-0">DONE</span>
          <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="btn-danger !px-2 !py-1 !text-xs shrink-0" @click="endFiring">End</button>
        </template>
        <!-- Account link -->
        <NuxtLink to="/account" class="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors ml-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Account
        </NuxtLink>
      </div>
    </header>

    <!-- Body -->
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
        <div
          class="hidden sm:flex flex-1 bg-white rounded-xl border border-stone-200 shadow-sm relative items-center justify-center min-h-0 sm:m-5 sm:mt-4"
        >
          <canvas ref="chartCanvas" class="w-full h-full"></canvas>
          <button
            v-if="selectedFiring"
            class="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg bg-white text-stone-500 hover:bg-stone-50 transition-colors shadow-sm"
            @click="resetZoom"
          >Reset zoom</button>
          <div v-if="isManual && isLive && !selectedFiring?.readings?.length" class="absolute flex flex-col items-center gap-2 text-stone-400 pointer-events-none">
            <p class="text-sm">Use <strong>Log Reading</strong> to record your first temperature</p>
          </div>
          <div v-else-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-stone-400">
            <p class="text-sm">Select a firing from the sidebar or start a new one</p>
          </div>
        </div>

        <!-- Mobile view -->
        <div class="flex flex-col flex-1 sm:hidden overflow-hidden">

          <!-- No firing -->
          <div v-if="!selectedFiring" class="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p class="text-stone-400 text-sm">No firing selected</p>
            <button class="btn-primary px-6 py-3" @click="openStartModal">+ Start Firing</button>
            <button class="text-sm text-orange-500" @click="showFiringSheet = true">View past firings</button>
          </div>

          <!-- Firing selected — compact overview -->
          <template v-else>
            <!-- Compact stats row -->
            <div class="shrink-0 px-2 pt-2 flex gap-1.5">
              <button
                class="flex-1 bg-white border border-stone-200 rounded-lg py-1.5 px-2 flex flex-col items-center active:bg-orange-50"
                @click="showTempModal = true"
              >
                <span class="text-[10px] text-stone-400 uppercase tracking-wide leading-none mb-0.5">Now</span>
                <span class="text-xl font-bold tabular-nums leading-none" :class="currentTemp !== null ? 'text-orange-500' : 'text-stone-300'">
                  {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
                </span>
                <span class="text-[10px] text-orange-400">°C</span>
              </button>
              <div class="flex-1 bg-white border border-stone-200 rounded-lg py-1.5 px-2 flex flex-col items-center">
                <span class="text-[10px] text-stone-400 uppercase tracking-wide leading-none mb-0.5">Peak</span>
                <span class="text-xl font-bold tabular-nums leading-none text-stone-700">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}</span>
                <span class="text-[10px] text-stone-400">°C</span>
              </div>
              <div class="flex-1 bg-white border border-stone-200 rounded-lg py-1.5 px-2 flex flex-col items-center">
                <span class="text-[10px] text-stone-400 uppercase tracking-wide leading-none mb-0.5">{{ isLive && !isManual ? 'Elapsed' : 'Readings' }}</span>
                <span class="text-xl font-bold tabular-nums leading-none text-stone-700">{{ isLive && !isManual ? elapsed : readingCount }}</span>
              </div>
              <div v-if="isLive && !isManual" class="flex-1 bg-white border border-stone-200 rounded-lg py-1.5 px-2 flex flex-col items-center">
                <span class="text-[10px] text-stone-400 uppercase tracking-wide leading-none mb-0.5">Rate</span>
                <span class="text-sm font-bold tabular-nums leading-none text-stone-700 mt-1">{{ rateOfChange }}</span>
              </div>
            </div>

            <!-- Thumbnail chart — tap anywhere to go fullscreen -->
            <div
              class="flex-1 m-2 mt-1.5 bg-white rounded-xl border border-stone-200 shadow-sm relative overflow-hidden"
              @click="chartFullscreen = true"
            >
              <canvas ref="chartCanvasMobile" class="w-full h-full"></canvas>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="bg-black/20 rounded-full p-3">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
                  </svg>
                </div>
              </div>
              <div
                v-if="isManual && isLive && !selectedFiring?.readings?.length"
                class="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <p class="text-xs text-stone-400 text-center px-6">Tap to open chart and log readings</p>
              </div>
            </div>

            <!-- Action bar -->
            <div class="shrink-0 px-2 pb-2 pt-1 flex gap-1.5">
              <button
                v-if="isLive && isManual"
                class="flex-1 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg active:bg-orange-600"
                @click="openLogReading"
              >+ Log Reading</button>
              <button
                v-if="isLive"
                class="py-2 px-3 border rounded-lg text-xs font-semibold shrink-0"
                :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-stone-200 bg-stone-50 text-stone-500'"
                @click="toggleMode"
              >{{ isManual ? '✏️ Manual' : '📡 Connected' }}</button>
              <button
                v-if="!isLive && !activeFiring"
                class="flex-1 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg active:bg-orange-600"
                @click="openStartModal"
              >+ Start Firing</button>
            </div>
          </template>
        </div>

      </main>
    </div>

    <!-- ===== MOBILE FULLSCREEN CHART ===== -->
    <Teleport to="body">
      <div
        v-if="chartFullscreen"
        class="sm:hidden fixed inset-0 z-50 bg-white flex flex-col"
      >
        <div class="shrink-0 flex items-center justify-between px-4 py-2 border-b border-stone-100">
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shrink-0">⚠️</span>
            <span v-else-if="isLive && !isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">● LIVE</span>
            <span v-else-if="isLive && isManual" class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">● ACTIVE</span>
            <span class="text-sm font-medium text-stone-600 truncate">{{ selectedFiring?.name }}</span>
          </div>
          <button
            class="ml-2 shrink-0 p-2 rounded-full bg-stone-100 text-stone-600 active:bg-stone-200"
            @click="chartFullscreen = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="shrink-0 flex gap-1.5 px-3 py-2 border-b border-stone-100">
          <div class="flex-1 flex flex-col items-center">
            <span class="text-[10px] text-stone-400 uppercase tracking-wide">Now</span>
            <span class="text-base font-bold tabular-nums" :class="currentTemp !== null ? 'text-orange-500' : 'text-stone-300'">
              {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}°C
            </span>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <span class="text-[10px] text-stone-400 uppercase tracking-wide">Peak</span>
            <span class="text-base font-bold tabular-nums text-stone-700">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}°C</span>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <span class="text-[10px] text-stone-400 uppercase tracking-wide">{{ isLive && !isManual ? 'Elapsed' : 'Readings' }}</span>
            <span class="text-base font-bold tabular-nums text-stone-700">{{ isLive && !isManual ? elapsed : readingCount }}</span>
          </div>
          <div v-if="isLive && !isManual" class="flex-1 flex flex-col items-center">
            <span class="text-[10px] text-stone-400 uppercase tracking-wide">Rate</span>
            <span class="text-base font-bold tabular-nums text-stone-700">{{ rateOfChange }}</span>
          </div>
        </div>

        <div class="flex-1 relative min-h-0 p-2">
          <canvas ref="chartCanvasFullscreen" class="w-full h-full touch-none"></canvas>
          <button
            class="absolute bottom-4 right-4 px-2.5 py-1 text-xs font-medium border border-stone-200 rounded-lg bg-white text-stone-400 shadow-sm"
            @click="resetZoomFullscreen"
          >Reset zoom</button>
        </div>

        <div v-if="isLive" class="shrink-0 px-3 pb-4 pt-2 flex gap-2 border-t border-stone-100">
          <button
            v-if="isManual"
            class="flex-1 py-3 bg-orange-500 text-white text-sm font-bold rounded-xl active:bg-orange-600"
            @click="openLogReading"
          >+ Log Reading</button>
          <button
            class="py-3 px-4 border rounded-xl text-sm font-semibold shrink-0"
            :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-stone-200 bg-stone-50 text-stone-500'"
            @click="toggleMode"
          >{{ isManual ? '✏️ Manual' : '📡 Connected' }}</button>
        </div>
      </div>
    </Teleport>

    <!-- Mobile firing bottom sheet -->
    <Teleport to="body">
      <div
        v-if="showFiringSheet"
        class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden"
        style="background: rgba(0,0,0,0.5)"
        @click.self="showFiringSheet = false"
      >
        <div class="bg-white rounded-t-2xl flex flex-col" style="max-height: 75vh">
          <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div class="w-10 h-1 bg-stone-300 rounded-full"></div>
          </div>
          <div class="flex items-center justify-between px-4 py-2 border-b border-stone-100 shrink-0">
            <h2 class="text-sm font-semibold text-stone-700">Firings</h2>
            <button class="p-1 text-stone-400" @click="showFiringSheet = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <ul class="overflow-y-auto flex-1 divide-y divide-stone-100">
            <li v-if="activeFiring">
              <button
                class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-stone-50"
                :class="selectedFiring?.id === activeFiring.id ? 'bg-orange-50' : ''"
                @click="selectFiring(activeFiring); showFiringSheet = false"
              >
                <div class="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                <div>
                  <p class="text-sm font-semibold text-stone-700">{{ activeFiring.name }}</p>
                  <p class="text-xs text-green-600 mt-0.5">● Live</p>
                </div>
              </button>
            </li>
            <li v-if="!pastFirings.length && !activeFiring" class="px-4 py-6 text-sm text-stone-400 text-center">
              No firings yet
            </li>
            <li v-for="f in pastFirings" :key="f.id" class="relative">
              <button
                class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-stone-50 pr-20"
                :class="selectedFiring?.id === f.id ? 'bg-orange-50' : ''"
                @click="selectFiring(f); showFiringSheet = false"
              >
                <div class="w-2 h-2 rounded-full bg-stone-300 shrink-0"></div>
                <div>
                  <p class="text-sm font-medium text-stone-700">{{ f.name }}</p>
                  <p class="text-xs text-stone-400 mt-0.5">{{ formatDate(f.created_at) }}</p>
                </div>
              </button>
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <button
                  v-if="sheetConfirmDeleteId !== f.id"
                  class="p-2 text-stone-300"
                  @click.stop="sheetConfirmDeleteId = f.id"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
                <button
                  v-else
                  class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500"
                  @click.stop="sheetDeleteFiring(f)"
                >Delete?</button>
              </div>
            </li>
          </ul>
          <div class="p-3 border-t border-stone-100 shrink-0">
            <button class="btn-primary w-full py-3" @click="openStartModal(); showFiringSheet = false">
              + Start Firing
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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

<script setup>
import { useKilnChart } from '~/composables/useKilnChart'

definePageMeta({ middleware: ['auth'] })

const chartCanvas           = ref(null)
const chartCanvasMobile     = ref(null)
const chartCanvasFullscreen = ref(null)
const chartFullscreen       = ref(false)

const editingReading       = ref(null)
const showReadingModal     = ref(false)
const showFiringSheet      = ref(false)
const sheetConfirmDeleteId = ref(null)

const showStartModal  = ref(false)
const showTempModal   = ref(false)
const allFirings      = ref([])
const selectedFiring  = ref(null)
const currentTemp     = ref(null)
const isLive          = ref(false)
const isManual        = ref(false)
const signalLost      = ref(false)
const lastReadingTime = ref(null)
const library         = ref([])

// Desktop chart — zoom enabled
const { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  onPointClick: (point) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value = {
      id: point.raw?.id ?? point.id,
      ts: point.raw?.ts ?? point.ts,
      y:  point.y,
      x:  point.x,
    }
    showReadingModal.value = true
  },
})

// Mobile thumbnail — no zoom, no interaction
const { init: initMobile, setSchedule: setScheduleMobile, setReadings: setReadingsMobile, destroy: destroyMobile } = useKilnChart(chartCanvasMobile, { enableZoom: false })

// Mobile fullscreen — zoom enabled, point click enabled
const {
  init:          initFs,
  setSchedule:   setScheduleFs,
  setReadings:   setReadingsFs,
  setManualMode: setManualModeFs,
  resetZoom:     resetZoomFullscreen,
  destroy:       destroyFs,
} = useKilnChart(chartCanvasFullscreen, {
  enableZoom: true,
  onPointClick: (point) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value = {
      id: point.raw?.id ?? point.id,
      ts: point.raw?.ts ?? point.ts,
      y:  point.y,
      x:  point.x,
    }
    showReadingModal.value = true
  },
})

// Open fullscreen chart and init it
watch(chartFullscreen, async (open) => {
  if (open) {
    await nextTick()
    await initFs()
    if (selectedFiring.value) {
      setScheduleFs(selectedFiring.value.schedule ?? [])
      setReadingsFs(selectedFiring.value.readings ?? [], selectedFiring.value.started_at)
      setManualModeFs(isManual.value)
    }
  } else {
    destroyFs()
  }
})

// Keep fullscreen in sync with new readings
watch(
  () => selectedFiring.value?.readings,
  (readings) => {
    if (chartFullscreen.value && selectedFiring.value && readings) {
      setReadingsFs(readings, selectedFiring.value.started_at)
    }
  },
  { deep: true }
)

const SIGNAL_TIMEOUT = 30

const sidebarOpen  = ref(true)
const sidebarWidth = ref(280)
const MIN_WIDTH    = 180
const isDragging   = ref(false)

let pollInterval        = null
let signalCheckInterval = null
let elapsedTickInterval = null

const nowUnix = ref(Math.floor(Date.now() / 1000))

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))

const peakTemp = computed(() => {
  if (!selectedFiring.value?.readings?.length) return null
  return Math.max(...selectedFiring.value.readings.map(r => r.temperature))
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

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stopAllIntervals() {
  if (pollInterval)        { clearInterval(pollInterval);        pollInterval        = null }
  if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null }
  if (elapsedTickInterval) { clearInterval(elapsedTickInterval); elapsedTickInterval = null }
}

function startDrag(e) {
  isDragging.value = true
  const startX     = e.clientX
  const startWidth = sidebarWidth.value
  const maxWidth   = () => Math.floor(window.innerWidth / 3)
  function onMove(e) {
    sidebarWidth.value = Math.min(Math.max(startWidth + e.clientX - startX, MIN_WIDTH), maxWidth())
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
  if (!library.value.length) library.value = await $fetch('/api/library')
  showStartModal.value = true
}

function openLogReading() {
  editingReading.value   = null
  showReadingModal.value = true
}

function closeReadingModal() {
  showReadingModal.value = false
  editingReading.value   = null
}

async function saveReading(payload) {
  if (!selectedFiring.value) return
  if (editingReading.value) {
    const id = editingReading.value.id ?? editingReading.value.raw?.id
    await $fetch(`/api/readings/${id}`, { method: 'PUT', body: { temperature: payload.temperature } })
  } else {
    await $fetch('/api/readings', {
      method: 'POST',
      body: { firingId: selectedFiring.value.id, temperature: payload.temperature, timestamp: payload.timestamp },
    })
  }
  closeReadingModal()
  await reloadReadings()
}

async function deleteReading() {
  if (!editingReading.value) return
  const id = editingReading.value.id ?? editingReading.value.raw?.id
  await $fetch(`/api/readings/${id}`, { method: 'DELETE' })
  closeReadingModal()
  await reloadReadings()
}

async function reloadReadings() {
  if (!selectedFiring.value) return
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.readings = data.readings
  setReadings(data.readings, selectedFiring.value.started_at)
  setReadingsMobile(data.readings, selectedFiring.value.started_at)
  if (data.readings?.length) {
    currentTemp.value     = data.readings.at(-1).temperature
    lastReadingTime.value = data.readings.at(-1).timestamp
  }
}

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
    if (pollInterval)        { clearInterval(pollInterval);        pollInterval        = null }
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

onMounted(async () => {
  console.log('[KilnMonitor] mounted')
  await init()
  await initMobile()
  await refreshFirings()
  if (activeFiring.value) await selectFiring(activeFiring.value)
})

onUnmounted(() => {
  stopAllIntervals()
  destroy()
  destroyMobile()
  destroyFs()
})

async function refreshFirings() {
  allFirings.value = await $fetch('/api/firings')
}

async function selectFiring(f) {
  console.log('[KilnMonitor] selectFiring()', f.id, f.name)
  stopAllIntervals()
  isLive.value          = false
  isManual.value        = false
  signalLost.value      = false
  currentTemp.value     = null
  lastReadingTime.value = null

  const data = await $fetch(`/api/firings/${f.id}`)
  selectedFiring.value = data

  setSchedule(data.schedule ?? [])
  setReadings(data.readings ?? [], data.started_at)
  setScheduleMobile(data.schedule ?? [])
  setReadingsMobile(data.readings ?? [], data.started_at)

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

    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)

    if (!isManual.value) {
      if (!data.readings?.length) {
        signalLost.value = true
        setSignalLost(data.started_at, null)
      } else {
        const secondsSinceLast = Math.floor(Date.now() / 1000) - lastReadingTime.value
        if (secondsSinceLast > SIGNAL_TIMEOUT) {
          signalLost.value = true
          setSignalLost(data.started_at, lastReadingTime.value)
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
  signalLost.value  = false
  isLive.value      = false
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

async function deleteFiring(f) {
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
    const rows = await $fetch(`/api/readings?firingId=${selectedFiring.value.id}`)
    selectedFiring.value.readings = rows
    setReadings(rows, selectedFiring.value.started_at)
    setReadingsMobile(rows, selectedFiring.value.started_at)
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
.btn-primary { @apply px-4 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed; }
.btn-danger  { @apply px-4 py-1.5 border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors; }
.btn-ghost   { @apply px-4 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-medium rounded-lg transition-colors; }
.input       { @apply w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300; }
.label       { @apply text-xs font-semibold uppercase tracking-wide text-stone-400; }
.stat-pill   { @apply flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-1.5; }
.stat-label  { @apply text-xs text-stone-400 uppercase tracking-wide; }
.stat-value  { @apply text-sm font-semibold text-stone-700; }
</style>