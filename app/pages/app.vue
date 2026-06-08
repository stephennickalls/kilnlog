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
          <span v-if="isLive" class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">● ACTIVE</span>
          <span v-else-if="!selectedFiring.ended_at" class="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">⏳</span>
          <span v-else class="px-2 py-0.5 text-xs font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3 shrink-0">DONE</span>
          <template v-if="activeFiring && selectedFiring.id === activeFiring.id">
            <button v-if="isLive && !isPaused" class="hidden sm:flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors" @click="pauseFiring">⏸ Pause</button>
            <button v-if="isPaused" class="hidden sm:block shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-flame hover:bg-flame-dark text-parchment transition-colors" @click="resumeFiring">▶ Resume</button>
            <div v-if="isLive && !isPaused" class="relative shrink-0 hidden sm:block">
              <button class="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-flame/40 text-flame bg-flame-bg hover:bg-flame/10 transition-colors" @click="showRecalibrateInfo = !showRecalibrateInfo">
                ↻ Recalibrate
                <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </button>
              <div v-if="showRecalibrateInfo" class="absolute right-0 top-full mt-2 w-72 z-50 bg-white border border-parchment-3 rounded-xl p-3 text-left" style="box-shadow:0 4px 20px rgba(58,30,8,0.12)">
                <p class="text-xs font-bold text-ink mb-1">When to recalibrate</p>
                <p class="text-xs text-ink-muted leading-relaxed">Use this when your kiln has fallen behind the planned curve — a weak burner, a stall, or after a gas-out. It slides the rest of your schedule to start from your <strong>current temperature</strong>, keeping every ramp rate intact. Your firing just finishes later.</p>
                <div class="flex gap-2 mt-3">
                  <button class="flex-1 py-1.5 bg-flame hover:bg-flame-dark text-parchment text-xs font-bold rounded-lg transition-colors" @click="recalibrate">Recalibrate now</button>
                  <button class="px-3 py-1.5 border border-parchment-3 text-ink-muted text-xs font-semibold rounded-lg hover:bg-parchment-2 transition-colors" @click="showRecalibrateInfo = false">Cancel</button>
                </div>
              </div>
            </div>
            <button class="btn-danger !px-3 !py-1.5 !text-xs shrink-0 hidden sm:block" @click="endFiring">End</button>
          </template>
        </template>
        <UserMenu />
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
            v-if="selectedFiring && !selectedFiring.ended_at"
            :target-temp="targetTemp"
            :target-rate="targetRate"
            :duration="duration"
            :rate-of-change="rateOfChange"
            :elapsed="elapsed"
            :reading-count="readingCount"
            :is-live="isLive"
            :current-temp="currentTemp"
            @open-temp="showTempModal = true"
            @log-reading="openLogReading"
          />
          <div v-else-if="selectedFiring?.ended_at && !activeFiring" class="flex items-center gap-3 px-1 py-1">
            <span class="text-sm text-ink-muted">This firing has ended.</span>
            <button class="flex items-center gap-2 px-4 py-1.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-lg transition-colors" @click="restartFiring(selectedFiring)">↺ Restart firing</button>
          </div>
        </div>

        <!-- Desktop chart -->
        <div class="hidden sm:flex flex-1 bg-white rounded-xl border border-parchment-3 relative items-center justify-center min-h-0 sm:m-5 sm:mt-4" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <canvas ref="chartCanvas" class="w-full h-full"/>
          <button v-if="selectedFiring" class="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium border border-parchment-3 rounded-lg bg-white text-ink-muted hover:bg-parchment transition-colors" @click="resetZoom">Reset zoom</button>
          <div v-if="isLive && !selectedFiring?.readings?.length" class="absolute flex flex-col items-center gap-2 text-ink-muted pointer-events-none">
            <p class="text-sm">Use <strong>Log Reading</strong> to record your first temperature</p>
          </div>
          <div v-else-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-ink-muted">
            <p class="text-sm">Select a firing from the sidebar or start a new one</p>
          </div>
          <div v-if="isPaused" class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
            ⏸ Paused — resume when your kiln is firing again
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

            <!-- ── Mobile stats row ── -->
            <div class="shrink-0 px-2 pt-2 flex gap-1.5">
              <!-- Current -->
              <button class="flex-1 bg-white border border-parchment-3 rounded-lg py-2 px-2 flex flex-col items-center active:bg-flame-bg" @click="showTempModal = true">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-0.5">Now</span>
                <span class="text-2xl font-bold tabular-nums leading-none" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-4'">
                  {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
                </span>
                <span class="text-[10px] text-flame-light">°C</span>
              </button>

              <!-- Target temp -->
              <div v-if="targetTemp !== null" class="flex-1 bg-white border border-parchment-3 rounded-lg py-2 px-2 flex flex-col items-center">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-0.5">Target</span>
                <span class="text-2xl font-bold tabular-nums leading-none text-ink-muted">{{ targetTemp }}</span>
                <span class="text-[10px] text-ink-faint">°C</span>
              </div>

              <!-- Rate: act + tgt stacked -->
              <div class="flex-1 bg-white border border-parchment-3 rounded-lg py-2 px-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-ink-faint uppercase tracking-wide leading-none mb-1">Rate</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-[9px] font-bold text-ink-faint uppercase">act</span>
                  <span class="text-sm font-bold tabular-nums" :class="mobileRateColorClass">{{ rateOfChange }}</span>
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="text-[9px] font-bold text-ink-faint uppercase">tgt</span>
                  <span class="text-sm font-bold tabular-nums text-ink-muted">{{ targetRate }}</span>
                </div>
              </div>

              <!-- Actions column: Log + ⋯ -->
              <div class="flex flex-col gap-1">
                <button
                  v-if="isLive"
                  class="flex-1 bg-flame text-parchment rounded-lg px-3 flex flex-col items-center justify-center active:bg-flame-dark transition-colors"
                  @click="openLogReading"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  <span class="text-[9px] font-bold uppercase mt-0.5">Log</span>
                </button>
                <button
                  class="flex-1 bg-white border border-parchment-3 rounded-lg px-3 flex flex-col items-center justify-center text-ink-muted active:bg-parchment-2"
                  @click="showMobileMenu = !showMobileMenu"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
              </div>
            </div>

            <!-- ── Mobile chart ── -->
            <div class="flex-1 relative min-h-0 px-2 py-2 flex items-stretch">
              <div class="flex-1 bg-white rounded-xl border border-parchment-3 relative" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
                <canvas ref="chartCanvasMobile" class="w-full h-full"/>
                <button class="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white border border-parchment-3 text-ink-muted" @click="resetZoomMobile">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/></svg>
                </button>
              </div>
            </div>

            <!-- ── Mobile overflow menu sheet ── -->
            <Teleport to="body">
              <div v-if="showMobileMenu" class="fixed inset-0 z-[60] flex items-end sm:hidden" style="background:rgba(26,18,8,0.5)" @click.self="showMobileMenu = false">
                <div class="bg-parchment rounded-t-2xl w-full p-4 flex flex-col gap-2">
                  <div class="w-10 h-1 bg-parchment-3 rounded-full mx-auto mb-2"/>

                  <button v-if="isPaused" class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl active:bg-flame-dark" @click="resumeFiring(); showMobileMenu = false">▶ Resume firing</button>
                  <button v-else-if="isLive" class="w-full py-3 border border-amber-300 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl" @click="pauseFiring(); showMobileMenu = false">⏸ Pause</button>
                  <button v-if="isLive && !isPaused" class="w-full py-3 border border-flame/40 bg-flame-bg text-flame text-sm font-bold rounded-xl" @click="showMobileMenu = false; showRecalibrateInfo = true">↻ Recalibrate</button>
                  <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="w-full py-3 border border-red-300 text-red-500 text-sm font-bold rounded-xl" @click="endFiring(); showMobileMenu = false">End firing</button>
                  <button v-if="!isLive && !activeFiring && selectedFiring?.ended_at" class="w-full py-3 bg-amber-500 text-white text-sm font-bold rounded-xl" @click="restartFiring(selectedFiring); showMobileMenu = false">↺ Restart firing</button>
                  <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl mt-1" @click="showMobileMenu = false">Cancel</button>
                </div>
              </div>
            </Teleport>

            <!-- Mobile recalibrate sheet -->
            <Teleport to="body">
              <div v-if="showRecalibrateInfo" class="fixed inset-0 z-[60] flex items-end sm:hidden" style="background:rgba(26,18,8,0.6)" @click.self="showRecalibrateInfo = false">
                <div class="bg-parchment rounded-t-2xl w-full p-5 flex flex-col gap-3">
                  <p class="text-sm font-bold text-ink">When to recalibrate</p>
                  <p class="text-sm text-ink-muted leading-relaxed">Use this when your kiln has fallen behind the planned curve — a weak burner, a stall, or after a gas-out. It slides the rest of your schedule to start from your <strong>current temperature</strong>, keeping every ramp rate intact. Your firing just finishes later.</p>
                  <button class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="recalibrate">Recalibrate now</button>
                  <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg" @click="showRecalibrateInfo = false">Cancel</button>
                </div>
              </div>
            </Teleport>

          </template>
        </div>

      </main>
    </div>

    <!-- ── Mobile firing sheet ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showFiringSheet" class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden" style="background:rgba(26,18,8,0.6)" @click.self="showFiringSheet = false">
        <div class="bg-parchment rounded-t-2xl flex flex-col" style="max-height:80vh">
          <div class="flex justify-center pt-3 pb-1 shrink-0"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
          <div class="flex items-center justify-between px-4 py-2 border-b border-parchment-3 shrink-0">
            <h2 class="text-sm font-bold text-ink">Firings</h2>
            <button class="p-1 text-ink-muted" @click="showFiringSheet = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <ul class="overflow-y-auto flex-1 divide-y divide-parchment-3">
            <li v-if="activeFiring">
              <button class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 transition-colors" :class="selectedFiring?.id === activeFiring.id ? 'bg-flame-bg border-l-2 border-flame' : ''" @click="selectFiring(activeFiring); showFiringSheet = false">
                <div class="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse"/>
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
                <div class="w-2 h-2 rounded-full bg-parchment-4 shrink-0"/>
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
      :rate-of-change="rateOfChange"
      :elapsed="elapsed"
      :is-live="isLive"
      :firing-name="selectedFiring?.name"
      @close="showTempModal = false"
    />

    <StartFiringModal
      :open="showStartModal"
      :library="library"
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

    <!-- ── Toast ─────────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toast.visible.value"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif max-w-sm w-[calc(100%-2rem)]"
          :class="toast.type.value === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'"
        >
          <span class="flex-1">{{ toast.message.value }}</span>
          <button class="shrink-0 opacity-75 hover:opacity-100" @click="toast.hide()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/app.vue
import { useKilnChart } from '~/composables/useKilnChart'

definePageMeta({ middleware: ['auth'] })

const toast = useToast()

const chartCanvas          = ref(null)
const chartCanvasMobile    = ref(null)
const editingReading       = ref(null)
const showReadingModal     = ref(false)
const showFiringSheet      = ref(false)
const sheetConfirmDeleteId = ref(null)
const showStartModal       = ref(false)
const showTempModal        = ref(false)
const showMobileMenu       = ref(false)
const allFirings           = ref([])
const selectedFiring       = ref(null)
const currentTemp          = ref(null)
const isSaving             = ref(false)
const isLive               = ref(false)
const isPaused             = ref(false)
const library              = ref([])
const showRecalibrateInfo  = ref(false)
const sidebarOpen          = ref(true)
const sidebarWidth         = ref(280)
const MIN_WIDTH            = 180
const isDragging           = ref(false)
const nowUnix              = ref(Math.floor(Date.now() / 1000))

let elapsedTickInterval = null

const { init, setSchedule, setReadings, resetZoom, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  showLabels: true,
  onPointClick: (point) => {
    if (!isLive.value) return
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, y: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const { init: initMobile, setSchedule: setScheduleMobile, setReadings: setReadingsMobile, resetZoom: resetZoomMobile, destroy: destroyMobile } = useKilnChart(chartCanvasMobile, { enableZoom: true, showLabels: true })

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))

const { duration, readingCount, elapsed, rateOfChange, targetRate, targetTemp }
  = useFiringStats(selectedFiring, nowUnix)

const scheduleOffset = computed(() => selectedFiring.value?.schedule_offset ?? 0)

function applySchedule(scheduleRows) {
  const rows = scheduleRows ?? selectedFiring.value?.schedule ?? []
  setSchedule(rows, scheduleOffset.value)
  setScheduleMobile(rows, scheduleOffset.value)
}

// Mobile rate colour
function parseMobileRate(str) {
  if (!str || str === '—') return null
  const n = parseFloat(str.replace('°/m', ''))
  return isFinite(n) ? n : null
}
const mobileRateColorClass = computed(() => {
  const actual = parseMobileRate(rateOfChange.value)
  const target = parseMobileRate(targetRate.value)
  if (actual === null) return 'text-ink-faint'
  if (target === null) return 'text-green-600'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-600'
  if (diff < -1.5) return 'text-blue-600'
  return 'text-green-600'
})

onMounted(async () => {
  await init()
  await refreshFirings()
  if (activeFiring.value) await selectFiring(activeFiring.value)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  stopAllIntervals()
  destroy()
  destroyMobile()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stopAllIntervals() {
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

async function onVisibilityChange() {
  if (document.hidden) return
  if (!selectedFiring.value) return
  // Returning to a foregrounded PWA: the canvas may have been resized or
  // detached while hidden. Reloading readings runs setReadings, which
  // self-heals the chart (rebuilding if the canvas was recreated).
  await reloadReadings()
  if (isLive.value && !elapsedTickInterval) {
    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
  }
}

async function refreshFirings() {
  allFirings.value = await $fetch('/api/firings')
}

async function selectFiring(f) {
  stopAllIntervals()
  isLive.value = false
  isPaused.value = false
  currentTemp.value = null

  const data = await $fetch(`/api/firings/${f.id}`)
  selectedFiring.value = data
  setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
  setReadings(data.readings ?? [], data.started_at)
  await nextTick(); await initMobile()
  setScheduleMobile(data.schedule ?? [], data.schedule_offset ?? 0)
  setReadingsMobile(data.readings ?? [], data.started_at)

  if (data.readings?.length) {
    currentTemp.value = data.readings.at(-1).temperature
  }

  const isActive = !!(data.started_at && !data.ended_at)

  if (isActive && data.paused_at) {
    isPaused.value = true
    isLive.value = true
    return
  }

  if (isActive) {
    isLive.value = true
    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
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
  isLive.value = isPaused.value = false
  currentTemp.value = null
  await refreshFirings()
  if (selectedFiring.value?.id === id) {
    const data = await $fetch(`/api/firings/${id}`)
    selectedFiring.value = data
    setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
    setReadings(data.readings ?? [], data.started_at)
    setScheduleMobile(data.schedule ?? [], data.schedule_offset ?? 0)
    setReadingsMobile(data.readings ?? [], data.started_at)
  }
}

async function restartFiring(f) {
  if (!f?.started_at || !f?.ended_at) { toast.show('This firing can\u2019t be restarted.'); return }
  if (activeFiring.value) { toast.show(`End "${activeFiring.value.name}" first — only one firing can be active at a time.`); return }
  try {
    await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { endedAt: null } })
    await refreshFirings()
    const fresh = allFirings.value.find(fi => fi.id === f.id)
    await selectFiring(fresh ?? f)
  } catch (err) {
    toast.show(`Couldn\u2019t restart: ${err?.data?.message ?? err.message ?? 'Unknown error'}`)
  }
}

async function pauseFiring() {
  const f = selectedFiring.value
  if (!f || !isLive.value || isPaused.value) return
  const pausedAt = Math.floor(Date.now() / 1000)
  await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { pausedAt } })
  stopAllIntervals()
  isPaused.value = true
  f.paused_at = pausedAt
}

async function resumeFiring() {
  const f = selectedFiring.value
  if (!f || !isPaused.value || !f.paused_at) return
  const gapMins = Math.round((Math.floor(Date.now() / 1000) - f.paused_at) / 60)
  const newOffset = (f.schedule_offset ?? 0) + gapMins
  await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { pausedAt: null, scheduleOffset: newOffset } })
  f.schedule_offset = newOffset
  f.paused_at = null
  isPaused.value = false
  applySchedule()
  elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
  toast.show(`Resumed — schedule shifted ${gapMins} min to match.`, 'success')
}

async function recalibrate() {
  const f = selectedFiring.value
  if (!f || !isLive.value || currentTemp.value == null || !f.schedule?.length) return
  const schedule = [...f.schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)
  const temp = currentTemp.value
  let plannedMin = null
  for (let i = 0; i < schedule.length - 1; i++) {
    const a = schedule[i], b = schedule[i + 1]
    const lo = Math.min(a.target_temp, b.target_temp), hi = Math.max(a.target_temp, b.target_temp)
    if (temp >= lo && temp <= hi) {
      const span = b.target_temp - a.target_temp
      const frac = span === 0 ? 0 : (temp - a.target_temp) / span
      plannedMin = a.offset_minutes + frac * (b.offset_minutes - a.offset_minutes)
      break
    }
  }
  if (plannedMin == null) { toast.show('Current temperature is outside the planned range — can\u2019t recalibrate.'); return }
  const elapsedMins = (Math.floor(Date.now() / 1000) - f.started_at) / 60
  const newOffset = Math.round(elapsedMins - plannedMin)
  await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { scheduleOffset: newOffset } })
  f.schedule_offset = newOffset
  applySchedule()
  showRecalibrateInfo.value = false
  toast.show('Schedule recalibrated to current temperature.', 'success')
}

async function deleteFiring(f) {
  await $fetch(`/api/firings/${f.id}`, { method: 'DELETE' })
  if (selectedFiring.value?.id === f.id) {
    stopAllIntervals()
    selectedFiring.value = currentTemp.value = null
    isLive.value = isPaused.value = false
  }
  await refreshFirings()
}

async function openStartModal() {
  if (!library.value.length) library.value = await $fetch('/api/library')
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
      currentTemp.value = payload.temperature
    }
    closeReadingModal()
    await reloadReadings()
  } catch (err) {
    toast.show(`Failed to save: ${err?.data?.message ?? err.message ?? 'Unknown error'}`)
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
    toast.show(`Failed to delete: ${err?.data?.message ?? err.message ?? 'Unknown error'}`)
  }
}

async function reloadReadings() {
  if (!selectedFiring.value) return
  try {
    const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
    selectedFiring.value.readings = data.readings
    selectedFiring.value.schedule = data.schedule
    setReadings(data.readings, selectedFiring.value.started_at)
    setReadingsMobile(data.readings, selectedFiring.value.started_at)
    if (!isSaving.value && data.readings?.length) {
      currentTemp.value = data.readings.at(-1).temperature
    }
  } catch (err) {
    console.error('Failed to reload readings:', err)
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
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>