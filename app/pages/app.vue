<template>
  <div class="flex flex-col h-screen overflow-hidden bg-parchment font-serif">

    <!-- ── HEADER ── -->
    <header class="shrink-0 flex items-center justify-between px-4 py-3 bg-parchment border-b border-parchment-3">
      <div class="flex items-center gap-2">
        <button class="sm:hidden p-1.5 -ml-1 rounded-lg text-ink-muted active:bg-parchment-2" @click="showFiringSheet = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 class="text-base font-bold text-ink tracking-tight">Kiln.Log</h1>
      </div>

      <div class="flex items-center gap-2 min-w-0">
        <template v-if="selectedFiring">
          <span class="text-xs font-semibold text-ink-muted truncate max-w-[100px] sm:max-w-none">{{ selectedFiring.name }}</span>
          <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shrink-0">Signal lost</span>
          <span v-else-if="isLive && !isManual" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-50 border border-green-200 text-green-700 shrink-0">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Live
          </span>
          <span v-else-if="isLive && isManual" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>Manual
          </span>
          <span v-else-if="selectedFiring.ended_at" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-parchment-2 border border-parchment-3 text-ink-faint shrink-0">Done</span>
          <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="px-2.5 py-1 text-[10px] font-bold border border-red-300 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" @click="endFiring">End</button>
        </template>
        <NuxtLink to="/sensor-setup" class="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-ink-muted hover:text-ink hover:bg-parchment-2 rounded-lg transition-colors ml-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/>
          </svg>
          Sensor
        </NuxtLink>
        <NuxtLink to="/account" class="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-ink-muted hover:text-ink hover:bg-parchment-2 rounded-lg transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Account
        </NuxtLink>
      </div>
    </header>

    <!-- ── BODY ── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Desktop sidebar -->
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

      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- ── DESKTOP ── -->
        <div class="hidden sm:flex flex-col flex-1 overflow-hidden">
          <div class="p-4 pb-0">
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
          <div class="flex-1 m-4 mt-3 bg-white rounded-xl border border-parchment-3 relative min-h-0 flex items-center justify-center" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
            <canvas ref="chartCanvas" class="w-full h-full"></canvas>
            <button v-if="selectedFiring" class="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-medium border border-parchment-3 rounded-lg bg-parchment text-ink-faint hover:bg-parchment-2 transition-colors" @click="resetZoom">Reset zoom</button>
            <div v-if="isManual && isLive && !selectedFiring?.readings?.length" class="absolute flex flex-col items-center gap-2 text-ink-muted pointer-events-none">
              <p class="text-sm">Use <strong class="text-ink">Log Reading</strong> to record your first temperature</p>
            </div>
            <div v-else-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-ink-muted">
              <p class="text-sm">Select a firing from the sidebar or start a new one</p>
            </div>
          </div>
        </div>

        <!-- ── MOBILE ── -->
        <div class="flex flex-col flex-1 sm:hidden overflow-hidden">

          <!-- Empty state -->
          <div v-if="!selectedFiring" class="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div class="w-14 h-14 bg-parchment-2 border border-parchment-3 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l4-4 3 3 4-5 5 6" stroke="#b05c1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 5h18" stroke="#b05c1a" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <p class="font-bold text-ink mb-1">No firing selected</p>
              <p class="text-sm text-ink-muted">Start a new firing or tap the menu to view past ones</p>
            </div>
            <button class="bg-flame text-parchment px-6 py-3 rounded-lg text-sm font-bold hover:bg-flame-dark transition-colors" @click="openStartModal">+ Start firing</button>
            <button class="text-sm text-flame font-semibold" @click="showFiringSheet = true">View past firings</button>
          </div>

          <template v-else>
            <!-- Stats strip -->
            <div class="shrink-0 grid grid-cols-4 border-b border-parchment-3 bg-parchment">
              <button class="flex flex-col items-center py-3 px-1 border-r border-parchment-3 active:bg-parchment-2" @click="showTempModal = true">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Now</span>
                <span class="text-xl font-bold leading-none tabular-nums" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-3'">
                  {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
                </span>
                <span class="text-[9px] text-flame-light mt-0.5">°C</span>
              </button>
              <div class="flex flex-col items-center py-3 px-1 border-r border-parchment-3">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Peak</span>
                <span class="text-xl font-bold leading-none tabular-nums text-ink">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}</span>
                <span class="text-[9px] text-ink-faint mt-0.5">°C</span>
              </div>
              <div class="flex flex-col items-center py-3 px-1 border-r border-parchment-3">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">{{ isLive && !isManual ? 'Elapsed' : 'Readings' }}</span>
                <span class="text-lg font-bold leading-none tabular-nums text-ink">{{ isLive && !isManual ? elapsed : readingCount }}</span>
              </div>
              <div class="flex flex-col items-center py-3 px-1">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">{{ isLive && !isManual ? 'Rate' : 'Mode' }}</span>
                <span v-if="isLive && !isManual" class="text-sm font-bold leading-none text-green-600 tabular-nums">{{ rateOfChange }}</span>
                <span v-else-if="isManual" class="text-[10px] font-bold text-blue-600">Manual</span>
                <span v-else class="text-[10px] font-bold text-ink-faint">—</span>
              </div>
            </div>

            <!-- Chart — always visible, tap expand icon to fullscreen -->
            <div class="flex-1 mx-3 mt-3 mb-2 bg-white rounded-xl border border-parchment-3 relative overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
              <canvas ref="chartCanvasMobile" class="w-full h-full"></canvas>
              <!-- Expand button — small, unobtrusive corner button -->
              <button class="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-lg border border-parchment-3 text-ink-faint active:bg-parchment-2 z-10" @click="chartFullscreen = true">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
                </svg>
              </button>
              <div v-if="isManual && isLive && !selectedFiring?.readings?.length" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p class="text-xs text-ink-muted text-center px-6">Log your first reading to see the curve</p>
              </div>
            </div>

            <!-- Action bar -->
            <div class="shrink-0 px-3 pb-3 pt-1 flex gap-2">
              <button v-if="isLive && isManual" class="flex-1 py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openLogReading">+ Log reading</button>
              <button v-if="isLive" class="py-3 px-4 border rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5" :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-parchment-3 bg-parchment-2 text-ink-muted'" @click="toggleMode">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                {{ isManual ? 'Switch to Connected' : 'Switch to Manual' }}
              </button>
              <button v-if="!isLive && !activeFiring" class="flex-1 py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openStartModal">+ Start firing</button>
            </div>
          </template>
        </div>
      </main>
    </div>

    <!-- ── MOBILE FULLSCREEN CHART ── -->
    <Teleport to="body">
      <div v-if="chartFullscreen" class="sm:hidden fixed inset-0 z-50 bg-parchment flex flex-col">
        <div class="shrink-0 flex items-center justify-between px-4 py-3 border-b border-parchment-3">
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Signal lost</span>
            <span v-else-if="isLive && !isManual" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-50 border border-green-200 text-green-700">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Live
            </span>
            <span v-else-if="isLive && isManual" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>Manual
            </span>
            <span class="text-sm font-semibold text-ink truncate">{{ selectedFiring?.name }}</span>
          </div>
          <button class="p-2 rounded-full bg-parchment-2 text-ink active:bg-parchment-3" @click="chartFullscreen = false">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="shrink-0 grid grid-cols-4 border-b border-parchment-3">
          <div class="flex flex-col items-center py-2.5">
            <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-0.5">Now</span>
            <span class="text-base font-bold tabular-nums" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-3'">{{ currentTemp !== null ? Math.round(currentTemp) : '—' }}°C</span>
          </div>
          <div class="flex flex-col items-center py-2.5">
            <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-0.5">Peak</span>
            <span class="text-base font-bold tabular-nums text-ink">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}°C</span>
          </div>
          <div class="flex flex-col items-center py-2.5">
            <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-0.5">{{ isLive && !isManual ? 'Elapsed' : 'Readings' }}</span>
            <span class="text-base font-bold tabular-nums text-ink">{{ isLive && !isManual ? elapsed : readingCount }}</span>
          </div>
          <div class="flex flex-col items-center py-2.5">
            <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-0.5">Rate</span>
            <span class="text-sm font-bold tabular-nums text-ink">{{ rateOfChange }}</span>
          </div>
        </div>
        <div class="flex-1 relative min-h-0 p-3">
          <canvas ref="chartCanvasFullscreen" class="w-full h-full touch-none"></canvas>
          <button class="absolute bottom-5 right-5 px-3 py-1.5 text-xs font-medium border border-parchment-3 rounded-lg bg-parchment text-ink-faint" @click="resetZoomFullscreen">Reset zoom</button>
        </div>
        <div v-if="isLive" class="shrink-0 px-3 pb-4 pt-2 flex gap-2 border-t border-parchment-3">
          <button v-if="isManual" class="flex-1 py-3 bg-flame text-parchment text-sm font-bold rounded-lg" @click="openLogReading">+ Log reading</button>
          <button class="py-3 px-4 border rounded-lg text-xs font-bold shrink-0" :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-parchment-3 bg-parchment-2 text-ink-muted'" @click="toggleMode">{{ isManual ? 'Manual' : 'Connected' }}</button>
        </div>
      </div>
    </Teleport>

    <!-- ── MOBILE FIRING SHEET ── -->
    <Teleport to="body">
      <div v-if="showFiringSheet" class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden" style="background:rgba(26,18,8,0.6)" @click.self="showFiringSheet = false">
        <div class="bg-parchment rounded-t-2xl flex flex-col" style="max-height:80vh">
          <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div class="w-10 h-1 bg-parchment-3 rounded-full"></div>
          </div>
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
                  <p class="text-xs text-ink-faint mt-0.5">{{ formatDate(f.created_at) }}</p>
                </div>
              </button>
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <button v-if="sheetConfirmDeleteId !== f.id" class="p-2 text-parchment-4 active:text-red-400" @click.stop="sheetConfirmDeleteId = f.id">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
                <button v-else class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500" @click.stop="sheetDeleteFiring(f)">Delete?</button>
              </div>
            </li>
          </ul>
          <div class="p-3 border-t border-parchment-3 shrink-0">
            <button class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openStartModal(); showFiringSheet = false">+ Start firing</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── MODALS ── -->
    <KilnTempModal :open="showTempModal" :temp="currentTemp" :peak-temp="peakTemp" :rate-of-change="rateOfChange" :elapsed="elapsed" :is-live="isLive" :firing-name="selectedFiring?.name" @close="showTempModal = false" />
    <StartFiringModal :open="showStartModal" :library="library" :past-firings="pastFirings" @close="showStartModal = false" @create="createFiring" />
    <ManualReadingModal :open="showReadingModal" :started-at="selectedFiring?.started_at ?? 0" :is-edit="!!editingReading" :edit-temp="editingReading?.y ?? null" :edit-ts="editingReading?.ts ?? null" @close="closeReadingModal" @save="saveReading" @delete="deleteReading" />

  </div>
</template>

<script setup>
import { useKilnChart } from '~/composables/useKilnChart'

definePageMeta({ middleware: ['auth'] })

const chartCanvas           = ref(null)
const chartCanvasMobile     = ref(null)
const chartCanvasFullscreen = ref(null)
const chartFullscreen       = ref(false)
const editingReading        = ref(null)
const showReadingModal      = ref(false)
const showFiringSheet       = ref(false)
const sheetConfirmDeleteId  = ref(null)
const showStartModal        = ref(false)
const showTempModal         = ref(false)
const allFirings            = ref([])
const selectedFiring        = ref(null)
const currentTemp           = ref(null)
const isLive                = ref(false)
const isManual              = ref(false)
const signalLost            = ref(false)
const lastReadingTime       = ref(null)
const library               = ref([])

const { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  onPointClick: (point) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, y: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const { init: initMobile, setSchedule: setScheduleMobile, setReadings: setReadingsMobile, destroy: destroyMobile } = useKilnChart(chartCanvasMobile, { enableZoom: false, compact: true })

const { init: initFs, setSchedule: setScheduleFs, setReadings: setReadingsFs, setManualMode: setManualModeFs, resetZoom: resetZoomFullscreen, destroy: destroyFs } = useKilnChart(chartCanvasFullscreen, {
  enableZoom: true,
  onPointClick: (point) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, y: point.y, x: point.x }
    showReadingModal.value = true
  },
})

watch(chartFullscreen, async (open) => {
  if (open) {
    await nextTick(); await initFs()
    if (selectedFiring.value) {
      setScheduleFs(selectedFiring.value.schedule ?? [])
      setReadingsFs(selectedFiring.value.readings ?? [], selectedFiring.value.started_at)
      setManualModeFs(isManual.value)
    }
  } else { destroyFs() }
})

watch(() => selectedFiring.value?.readings, (readings) => {
  if (chartFullscreen.value && selectedFiring.value && readings) setReadingsFs(readings, selectedFiring.value.started_at)
}, { deep: true })

const SIGNAL_TIMEOUT = 30
const sidebarOpen    = ref(true)
const sidebarWidth   = ref(280)
const MIN_WIDTH      = 180
const isDragging     = ref(false)
let pollInterval = null, signalCheckInterval = null, elapsedTickInterval = null
const nowUnix = ref(Math.floor(Date.now() / 1000))

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))
const peakTemp     = computed(() => { if (!selectedFiring.value?.readings?.length) return null; return Math.max(...selectedFiring.value.readings.map(r => r.temperature)) })
const duration     = computed(() => { const f = selectedFiring.value; if (!f?.started_at || !f?.ended_at) return null; const mins = Math.round((f.ended_at - f.started_at) / 60), h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m` })
const readingCount = computed(() => selectedFiring.value?.readings?.length ?? 0)
const rateOfChange = computed(() => { const readings = selectedFiring.value?.readings; if (!readings || readings.length < 6) return '—'; const recent = readings.slice(-6), deltaTemp = recent[recent.length - 1].temperature - recent[0].temperature, deltaMins = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 60; if (deltaMins === 0) return '—'; const rate = Math.round(deltaTemp / deltaMins); return rate >= 0 ? `+${rate}°/m` : `${rate}°/m` })
const elapsed      = computed(() => { const f = selectedFiring.value; if (!f?.started_at) return '—'; const mins = Math.round((nowUnix.value - f.started_at) / 60), h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m` })

function formatDate(unix) { if (!unix) return ''; return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }
function stopAllIntervals() { if (pollInterval) { clearInterval(pollInterval); pollInterval = null } if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null } if (elapsedTickInterval) { clearInterval(elapsedTickInterval); elapsedTickInterval = null } }

function startDrag(e) {
  isDragging.value = true
  const startX = e.clientX, startWidth = sidebarWidth.value, maxWidth = () => Math.floor(window.innerWidth / 3)
  function onMove(e) { sidebarWidth.value = Math.min(Math.max(startWidth + e.clientX - startX, MIN_WIDTH), maxWidth()) }
  function onUp() { isDragging.value = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = document.body.style.userSelect = '' }
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
}

async function openStartModal() { if (!library.value.length) library.value = await $fetch('/api/library'); showStartModal.value = true }
function openLogReading() { editingReading.value = null; showReadingModal.value = true }
function closeReadingModal() { showReadingModal.value = false; editingReading.value = null }

async function saveReading(payload) {
  if (!selectedFiring.value) return
  if (editingReading.value) { const id = editingReading.value.id ?? editingReading.value.raw?.id; await $fetch(`/api/readings/${id}`, { method: 'PUT', body: { temperature: payload.temperature } }) }
  else await $fetch('/api/readings', { method: 'POST', body: { firingId: selectedFiring.value.id, temperature: payload.temperature, timestamp: payload.timestamp } })
  closeReadingModal(); await reloadReadings()
}

async function deleteReading() { if (!editingReading.value) return; const id = editingReading.value.id ?? editingReading.value.raw?.id; await $fetch(`/api/readings/${id}`, { method: 'DELETE' }); closeReadingModal(); await reloadReadings() }

async function reloadReadings() {
  if (!selectedFiring.value) return
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.readings = data.readings
  setReadings(data.readings, selectedFiring.value.started_at)
  setReadingsMobile(data.readings, selectedFiring.value.started_at)
  if (data.readings?.length) { currentTemp.value = data.readings.at(-1).temperature; lastReadingTime.value = data.readings.at(-1).timestamp }
}

async function toggleMode() {
  if (!selectedFiring.value || !isLive.value) return
  const newMode = isManual.value ? 'connected' : 'manual'
  await $fetch(`/api/firings/${selectedFiring.value.id}`, { method: 'PUT', body: { mode: newMode } })
  selectedFiring.value.mode = newMode; applyMode(newMode)
}

function applyMode(mode) {
  isManual.value = mode === 'manual'; setManualMode(isManual.value)
  if (isManual.value) { if (pollInterval) { clearInterval(pollInterval); pollInterval = null } if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null } signalLost.value = false; clearSignalLost() }
  else startPolling()
}

async function sheetDeleteFiring(f) { sheetConfirmDeleteId.value = null; showFiringSheet.value = false; await deleteFiring(f) }

// Re-init mobile chart whenever its canvas mounts (canvas only exists when selectedFiring is set and the v-else branch renders)
watch(chartCanvasMobile, async (canvas) => {
  if (canvas) {
    await initMobile()
    if (selectedFiring.value) {
      setScheduleMobile(selectedFiring.value.schedule ?? [])
      setReadingsMobile(selectedFiring.value.readings ?? [], selectedFiring.value.started_at)
    }
  }
})

onMounted(async () => { await init(); await refreshFirings(); if (activeFiring.value) await selectFiring(activeFiring.value) })
onUnmounted(() => { stopAllIntervals(); destroy(); destroyMobile(); destroyFs() })
async function refreshFirings() { allFirings.value = await $fetch('/api/firings') }

async function selectFiring(f) {
  stopAllIntervals(); isLive.value = isManual.value = signalLost.value = false; currentTemp.value = lastReadingTime.value = null
  const data = await $fetch(`/api/firings/${f.id}`)
  selectedFiring.value = data
  setSchedule(data.schedule ?? []); setReadings(data.readings ?? [], data.started_at)
  if (chartCanvasMobile.value) { await initMobile() }
  setScheduleMobile(data.schedule ?? []); setReadingsMobile(data.readings ?? [], data.started_at)
  if (data.readings?.length) { const last = data.readings.at(-1); currentTemp.value = last.temperature; lastReadingTime.value = last.timestamp }
  const isActive = !!(data.started_at && !data.ended_at)
  const mode = data.mode ?? 'connected'; isManual.value = mode === 'manual'; setManualMode(isManual.value)
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
  showStartModal.value = false; await refreshFirings()
  const fresh = allFirings.value.find(f => f.id === firing.id); await selectFiring(fresh ?? firing)
}

async function endFiring() {
  if (!activeFiring.value) return
  const id = activeFiring.value.id
  await $fetch(`/api/firings/${id}`, { method: 'PUT', body: { endedAt: Math.floor(Date.now() / 1000) } })
  stopAllIntervals(); signalLost.value = isLive.value = false; currentTemp.value = null
  await refreshFirings()
  if (selectedFiring.value?.id === id) {
    const data = await $fetch(`/api/firings/${id}`)
    selectedFiring.value = data; setSchedule(data.schedule ?? []); setReadings(data.readings ?? [], data.started_at)
    setScheduleMobile(data.schedule ?? []); setReadingsMobile(data.readings ?? [], data.started_at)
  }
}

async function deleteFiring(f) {
  await $fetch(`/api/firings/${f.id}`, { method: 'DELETE' })
  if (selectedFiring.value?.id === f.id) { stopAllIntervals(); selectedFiring.value = currentTemp.value = null; isLive.value = isManual.value = signalLost.value = false; clearSignalLost() }
  await refreshFirings()
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval); if (signalCheckInterval) clearInterval(signalCheckInterval)
  pollInterval = setInterval(async () => {
    if (!selectedFiring.value || isManual.value) return
    const rows = await $fetch(`/api/readings?firingId=${selectedFiring.value.id}`)
    selectedFiring.value.readings = rows; setReadings(rows, selectedFiring.value.started_at); setReadingsMobile(rows, selectedFiring.value.started_at)
    if (rows.length) { const last = rows.at(-1); currentTemp.value = last.temperature; lastReadingTime.value = last.timestamp; isLive.value = true; if (signalLost.value) { signalLost.value = false; clearSignalLost() } }
  }, 5000)
  signalCheckInterval = setInterval(() => {
    if (!selectedFiring.value || isManual.value) return
    const now = Math.floor(Date.now() / 1000)
    if (!lastReadingTime.value) { if (now - selectedFiring.value.started_at > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(selectedFiring.value.started_at, null) } return }
    if (now - lastReadingTime.value > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(selectedFiring.value.started_at, lastReadingTime.value) }
  }, 5000)
}
</script>

<style>
.btn-primary { @apply px-4 py-1.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed; }
.btn-danger  { @apply px-4 py-1.5 border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors; }
.btn-ghost   { @apply px-4 py-1.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-medium rounded-lg transition-colors; }
.input       { @apply w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-flame/20 focus:border-flame font-serif; }
.label       { @apply text-xs font-bold uppercase tracking-widest text-ink-faint; }
</style>