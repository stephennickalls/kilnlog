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
          <span class="text-xs sm:text-sm font-semibold text-ink truncate max-w-[120px] sm:max-w-none">{{ selectedFiring.name }}</span>
          <span v-if="isLive && !isPaused" class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">● ACTIVE</span>
          <span v-else-if="isPaused" class="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">⏸ PAUSED</span>
          <span v-else-if="!selectedFiring.ended_at" class="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">⏳</span>
          <span v-else class="px-2 py-0.5 text-xs font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3 shrink-0">DONE</span>
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

        <!-- ── Empty state — nothing selected ── -->
        <FiringEmptyState
          v-if="!selectedFiring"
          :recent-firing="pastFirings[0] ?? null"
          @start="openStartModal"
          @browse-schedules="goToSchedules"
          @select-recent="selectFiring"
        />

        <!-- ── A firing is selected ── -->
        <template v-else>

          <!-- Console (live) or Review (ended) -->
          <div class="shrink-0 p-3 sm:p-5 sm:pb-0">
            <FiringConsole
              v-if="!selectedFiring.ended_at"
              ref="consoleRef"
              :current-temp="currentTemp"
              :target-temp="targetTemp"
              :rate-of-change="rateOfChange"
              :target-rate="targetRate"
              :reading-count="readingCount"
              :is-live="isLive"
              :is-paused="isPaused"
              @open-temp="showTempModal = true"
              @log-reading="openLogReading"
              @pause="pauseFiring"
              @resume="resumeFiring"
              @recalibrate="openRecalibrate"
              @end="showEndConfirm = true"
            />
            <FiringReview
              v-else
              :firing="selectedFiring"
              :can-restart="!activeFiring"
              :peak-temp="peakTemp"
              :duration="duration"
              @fire-again="fireAgain"
              @save-as-schedule="saveAsSchedule"
              @restart="restartFiring"
            />
          </div>

          <!-- Chart -->
          <div class="flex-1 relative min-h-0 p-3 pt-2 sm:p-5 sm:pt-4 flex flex-col">
            <div class="flex-1 min-h-0 rounded-xl border border-parchment-3 relative" style="box-shadow:0 2px 12px rgba(58,30,8,0.06); background: linear-gradient(to right, rgba(95,138,120,0.07) 1px, transparent 1px) 0 0 / 12.5% 100%, linear-gradient(to bottom, rgba(95,138,120,0.07) 1px, transparent 1px) 0 0 / 100% 25%, #fcfdfc;">
              <canvas ref="chartCanvas" class="absolute inset-0 w-full h-full"/>
              <button class="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 px-2.5 py-1.5 text-xs font-medium border border-parchment-3 rounded-lg bg-white text-ink-muted hover:bg-parchment transition-colors" @click="resetZoom">Reset zoom</button>
              <div v-if="isLive && !selectedFiring?.readings?.length" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-muted pointer-events-none px-6 text-center">
                <p class="text-sm">Use <strong>Log Reading</strong> to record your first temperature</p>
              </div>
            </div>
          </div>

        </template>

      </main>
    </div>

    <!-- ── Recalibrate modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showRecalibrateInfo" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(26,18,8,0.55)" @click.self="showRecalibrateInfo = false">
        <div class="bg-parchment sm:bg-white w-full sm:w-80 sm:rounded-2xl rounded-t-2xl p-5 sm:border sm:border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">
          <p class="text-sm font-bold text-ink mb-1.5">When to recalibrate</p>
          <p class="text-sm text-ink-muted leading-relaxed">Use this when your kiln has fallen behind the planned curve — a weak burner, a stall, or after a gas-out. It slides the rest of your schedule to start from your <strong>current temperature</strong>, keeping every ramp rate intact. Your firing just finishes later.</p>
          <div class="flex gap-2 mt-4">
            <button class="flex-1 py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-lg transition-colors" @click="recalibrate">Recalibrate now</button>
            <button class="px-4 py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg hover:bg-parchment-2 transition-colors" @click="showRecalibrateInfo = false">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── End firing confirm modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showEndConfirm" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(26,18,8,0.6)" @click.self="showEndConfirm = false">
        <div class="bg-parchment w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-4 border border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">
          <div class="flex flex-col gap-1.5">
            <h2 class="text-base font-bold text-ink">End this firing?</h2>
            <p class="text-sm text-ink-muted leading-relaxed">
              This marks <strong>{{ selectedFiring?.name }}</strong> as finished and stops logging. You can restart it later if you need to keep going.
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <button class="px-4 py-2 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-lg transition-colors" @click="showEndConfirm = false">Cancel</button>
            <button class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors" @click="confirmEndFiring">End firing</button>
          </div>
        </div>
      </div>
    </Teleport>

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
            <!-- TEST: celadon button to verify custom palette is working -->
            <button class="w-full py-3 bg-celadon hover:bg-celadon-dark text-white text-sm font-bold rounded-lg transition-colors" @click="openStartModal(); showFiringSheet = false">+ Start firing</button>
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
          :class="toast.type.value === 'error' ? 'bg-red-600 text-white' : 'bg-celadon-dark text-white'"
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

const toast  = useToast()
const router = useRouter()

const chartCanvas          = ref(null)
const consoleRef           = ref(null)
const editingReading       = ref(null)
const showReadingModal     = ref(false)
const showFiringSheet      = ref(false)
const sheetConfirmDeleteId = ref(null)
const showStartModal       = ref(false)
const showTempModal        = ref(false)
const showEndConfirm       = ref(false)
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

const { init, setSchedule, setReadings, resetZoom, resize, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  showLabels: true,
  onPointClick: (point) => {
    if (!isLive.value) return
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, y: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))

const { duration, readingCount, elapsed, rateOfChange, targetRate, targetTemp }
  = useFiringStats(selectedFiring, nowUnix)

const peakTemp = computed(() => {
  const rs = selectedFiring.value?.readings
  if (!rs?.length) return null
  return rs.reduce((max, r) => r.temperature > max ? r.temperature : max, rs[0].temperature)
})

const scheduleOffset = computed(() => selectedFiring.value?.schedule_offset ?? 0)

function applySchedule(scheduleRows) {
  const rows = scheduleRows ?? selectedFiring.value?.schedule ?? []
  setSchedule(rows, scheduleOffset.value)
}

onMounted(async () => {
  await init()
  await refreshFirings()
  if (activeFiring.value) await selectFiring(activeFiring.value)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('resize', onWindowResize)
  requestAnimationFrame(() => requestAnimationFrame(() => resize()))
})

onUnmounted(() => {
  stopAllIntervals()
  destroy()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('resize', onWindowResize)
})

let resizeRaf = null
function onWindowResize() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => resize())
}

function formatDate(unix) {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stopAllIntervals() {
  if (elapsedTickInterval) { clearInterval(elapsedTickInterval); elapsedTickInterval = null }
}

function goToSchedules() { router.push('/schedules') }

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
  await reloadReadings()
  if (isLive.value && !elapsedTickInterval) {
    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
  }
}

async function refreshFirings() {
  allFirings.value = await $fetch('/api/firings')
}

async function selectFiring(f, preloaded = null) {
  stopAllIntervals()
  isLive.value = false
  isPaused.value = false
  currentTemp.value = null
  consoleRef.value?.closeMenu?.()

  let data = preloaded
  if (!data || data.schedule === undefined || data.readings === undefined) {
    data = await $fetch(`/api/firings/${f.id}`)
  }

  selectedFiring.value = data
  await nextTick()
  setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
  setReadings(data.readings ?? [], data.started_at)
  requestAnimationFrame(() => resize())

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
  refreshFirings()
  await selectFiring({ id: firing.id })
}

async function confirmEndFiring() {
  showEndConfirm.value = false
  if (!activeFiring.value) return
  const id = activeFiring.value.id
  const updated = await $fetch(`/api/firings/${id}`, {
    method: 'PUT',
    body: { endedAt: Math.floor(Date.now() / 1000) },
  })
  stopAllIntervals()
  isLive.value = isPaused.value = false
  currentTemp.value = null
  if (selectedFiring.value?.id === id) {
    selectedFiring.value = { ...selectedFiring.value, ended_at: updated.ended_at, auto_ended: updated.auto_ended }
  }
  refreshFirings()
}

async function restartFiring(f) {
  if (!f?.started_at || !f?.ended_at) { toast.show('This firing can\u2019t be restarted.'); return }
  if (activeFiring.value) { toast.show(`End "${activeFiring.value.name}" first — only one firing can be active at a time.`); return }
  try {
    const updated = await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { endedAt: null } })
    const restored = { ...f, ended_at: null, auto_ended: false, restarted_at: updated.restarted_at }
    const i = allFirings.value.findIndex(x => x.id === f.id)
    if (i !== -1) allFirings.value[i] = { ...allFirings.value[i], ended_at: null, auto_ended: false, restarted_at: updated.restarted_at }
    await selectFiring(restored, restored)
    refreshFirings()
  } catch (err) {
    toast.show(`Couldn\u2019t restart: ${err?.data?.message ?? err.message ?? 'Unknown error'}`)
  }
}

function fireAgain(f) {
  openStartModal({ fromFiringId: f.id, name: f.name })
}
function saveAsSchedule(f) {
  router.push(`/schedules/new?fromFiring=${f.id}`)
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

function openRecalibrate() { showRecalibrateInfo.value = true }

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

async function openStartModal(opts) {
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