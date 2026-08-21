<!-- File: app/pages/app.vue -->
<template>
  <!-- 100dvh, not h-screen: 100vh on iOS excludes Safari's URL bar and buried
       the console and the Reset-zoom button underneath it. -->
  <div class="flex flex-col h-screen overflow-hidden font-serif bg-parchment" style="height:100dvh">

    <!-- AppNav owns header layout; the hamburger stays here because on this
         page it opens the firing list, not navigation. -->
    <AppNav :sticky="false" container="max-w-none">
      <template #lead>
        <button
          class="sm:hidden p-2 -ml-1 rounded-lg text-ink-muted active:bg-parchment-2 transition-colors shrink-0"
          aria-label="Show firings"
          @click="showFiringSheet = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </template>

      <template #actions>
        <FeedbackButton />
        <TempUnitToggle size="md" @change="setChartUnit" />
      </template>
    </AppNav>

    <!-- ── Body ─────────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden min-w-0">

      <FiringSidebar
        class="hidden sm:flex"
        :open="sidebarOpen"
        :width="sidebarWidth"
        :selected-id="selectedFiring?.id ?? null"
        :active-firing="activeFiring"
        :past-firings="pastFirings"
        :has-more="hasMoreFirings"
        :loading-more="loadingOlderFirings"
        @toggle="sidebarOpen = !sidebarOpen"
        @select="selectFiring"
        @start="openStartModal"
        @rename="renamingFiring = $event"
        @drag="startDrag"
        @delete="deleteFiring"
        @load-more="loadOlderFirings"
      />

      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <PastDueBanner :grace-ends-at="pastDueGraceEndsAt" />
        <AnnouncementBanner :announcements="announcements" @dismiss="dismissAnnouncement" />

        <!-- Booting: shown instead of the empty state so a slow first load
             never reads as "you have no firings". -->
        <div v-if="booting" class="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted px-6">
          <span class="w-7 h-7 border-2 border-parchment-3 border-t-celadon rounded-full animate-spin"/>
          <p class="text-sm font-semibold">Loading your firings…</p>
        </div>

        <!-- DEMO (Aug 2026): the empty state now scrolls, because it carries a
             second card. A brand-new account has nothing to look at — chart,
             cone ruler, console and drop sheet are all invisible until a firing
             exists — so the first thing a potter sees is an argument they can't
             evaluate. DemoFiringCard fixes that; FiringEmptyState keeps the
             real paths (start a firing, browse schedules) above it. -->
        <div v-else-if="!selectedFiring" class="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <FiringEmptyState
            :recent-firing="pastFirings[0] ?? null"
            :active-firing="activeFiring"
            @start="openStartModal"
            @browse-schedules="goToSchedules"
            @select-recent="selectFiring"
          />
          <div class="px-4 pb-6 sm:px-6 sm:pb-8">
            <DemoFiringPrompt @created="onDemoCreated" />
          </div>
        </div>

        <template v-else>

          <!-- Demo data must never be mistakable for a real firing: a potter
               who later finds "Demo firing" in their history and can't remember
               whether they fired it has lost trust in the whole log. Deliberately
               not dismissible. -->
          <div v-if="selectedFiring.is_demo" class="shrink-0 px-3 pt-2 sm:px-5 sm:pt-2.5 min-w-0">
            <DemoFiringBanner :busy="demoBusy" @delete="deleteDemo" />
          </div>

          <div class="shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-0 sm:pt-2.5 min-w-0">
            <FiringConsole
              v-if="!selectedFiring.ended_at"
              ref="consoleRef"
              :current-temp="currentTemp"
              :target-temp="targetTemp"
              :rate-of-change="rateOfChange"
              :target-rate="targetRate"
              :rate-c="rateC"
              :target-rate-c="targetRateC"
              :target-temp-c="targetTempC"
              :next-cone="nextCone"
              :atmosphere="atmosphere"
              :reading-count="readingCount"
              :is-live="isLive"
              :is-paused="isPaused"
              :reduction-open="!!openReduction"
              :show-cone-button="coneButtonRoomy"
              @open-temp="showTempModal = true"
              @log-reading="openLogReading"
              @pause="pauseFiring"
              @resume="resumeFiring"
              @recalibrate="openRecalibrate"
              @end="showEndConfirm = true"
              @reduction="onToggleReduction"
              @notes="openNotes"
              @readings="showReadingsTable = true"
              @cone-drop="openConeSheet"
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
              @export="onExportFiring"
              @notes="openNotes"
            />
          </div>

          <div v-if="selectedFiring.auto_ended && selectedFiring.ended_at" class="px-3 sm:px-5 pt-2 min-w-0">
            <AutoEndedBanner :firing="selectedFiring" @restart="restartFiring(selectedFiring)" />
          </div>

          <!-- Chart -->
          <div class="flex-1 relative min-h-0 min-w-0 p-3 pt-2 sm:p-5 sm:pt-4 flex flex-col">
            <div class="flex-1 min-h-0 min-w-0 rounded-xl border border-parchment-3 relative" style="box-shadow:0 2px 12px rgba(58,30,8,0.06); background: linear-gradient(to right, rgba(95,138,120,0.07) 1px, transparent 1px) 0 0 / 12.5% 100%, linear-gradient(to bottom, rgba(95,138,120,0.07) 1px, transparent 1px) 0 0 / 100% 25%, #fcfdfc;">
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

    <!-- ── Sheets and modals ─────────────────────────────────────────────────── -->
    <RecalibrateModal
      :open="showRecalibrateInfo"
      @close="showRecalibrateInfo = false"
      @confirm="recalibrate"
    />

    <FiringNotesModal
      :open="showNotesModal"
      :firing-name="selectedFiring?.name ?? ''"
      :notes="selectedFiring?.notes ?? ''"
      :saving="notesSaving"
      @close="showNotesModal = false"
      @save="saveNotes"
    />

      <ConeDropSheet
      :open="showConeSheet"
      :cones="coneList"
      :pack="selectedFiring?.cone_pack ?? []"
      :drops="selectedFiring?.cone_drops ?? []"
      :started-at="selectedFiring?.started_at ?? 0"
      :busy="coneBusy"
      @close="showConeSheet = false"
      @log="logConeDrop"
      @remove="removeConeDrop"
    />

    <!-- Stays open across edits: fixing readings is usually a run, not one. -->
    <ReadingsTableModal
      :open="showReadingsTable"
      :readings="selectedFiring?.readings ?? []"
      :started-at="selectedFiring?.started_at ?? 0"
      :busy-id="readingBusyId"
      @close="showReadingsTable = false"
      @update="updateReadingFromTable"
      @delete="deleteReadingFromTable"
    />

    <FiringSidebarMobile
      :open="showFiringSheet"
      :selected-id="selectedFiring?.id ?? null"
      :active-firing="activeFiring"
      :past-firings="pastFirings"
      :has-more="hasMoreFirings"
      :loading-more="loadingOlderFirings"
      :deleting-id="sheetDeletingId"
      @close="showFiringSheet = false"
      @select="selectFiring($event); showFiringSheet = false"
      @start="openStartModal(); showFiringSheet = false"
      @delete="sheetDeleteFiring"
      @load-more="loadOlderFirings"
    />

    <KilnTempModal
      :open="showTempModal"
      :temp="currentTemp"
      :rate-of-change="rateOfChange"
      :elapsed="elapsed"
      :is-live="isLive"
      :firing-name="selectedFiring?.name"
      @close="showTempModal = false"
    />

    <!-- D1/D2: preselect cleared on close so the next open starts fresh. -->
    <StartFiringModal
      :open="showStartModal"
      :library="library"
      :past-firings="pastFirings"
      :preselect="preselect"
      @close="showStartModal = false; preselect = null"
      @create="createFiring"
    />

    <ManualReadingModal
      :open="showReadingModal"
      :started-at="selectedFiring?.started_at ?? 0"
      :is-edit="!!editingReading"
      :edit-temp="editingReading?.tempC ?? null"
      :edit-ts="editingReading?.ts ?? null"
      @close="closeReadingModal"
      @save="saveReading"
      @delete="deleteReading"
    />

    <ConfirmDialog
      :open="showEndConfirm"
      :title="`End ${selectedFiring?.name ?? 'this firing'}?`"
      message="This marks the firing as finished and stops logging. You can restart it later if you need to keep going."
      confirm-label="End firing"
      @confirm="confirmEndFiring"
      @cancel="showEndConfirm = false"
    />

    <ConfirmDialog
      :open="!!pendingDeleteFiring"
      :title="`Delete ${pendingDeleteFiring?.name ?? 'firing'}?`"
      message="This permanently removes the firing, its plan, and every logged reading. This cannot be undone."
      confirm-label="Delete firing"
      @confirm="performDeleteFiring(pendingDeleteFiring)"
      @cancel="pendingDeleteFiring = null"
    />

    <ConfirmDialog
      :open="showDemoDeleteConfirm"
      title="Delete the demo firing?"
      message="This removes the demo and everything logged against it. Your own firings are untouched, and you can load a new demo any time."
      confirm-label="Delete demo"
      @confirm="confirmDeleteDemo"
      @cancel="showDemoDeleteConfirm = false"
    />

    <RenameFiringModal
      :open="!!renamingFiring"
      :firing="renamingFiring"
      @close="renamingFiring = null"
      @renamed="onFiringRenamed"
    />

    <!-- ── Toast ─────────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toast.visible.value"
          class="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif max-w-sm w-[calc(100%-2rem)]"
          style="bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))"
          :class="toast.type.value === 'error' ? 'bg-red-600 text-white' : 'bg-celadon-dark text-white'"
        >
          <span class="flex-1 min-w-0">{{ toast.message.value }}</span>
          <button class="shrink-0 opacity-75 hover:opacity-100" aria-label="Dismiss" @click="toast.hide()">
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

// Role arrives in the bootstrap payload (server-verified) and is shared with
// UserMenu through this state.
const userRole = useState('user-role', () => null)

const toast  = useToast()
const router = useRouter()
const route  = useRoute()

const { exportFiring } = useFiringExport()
const { setUnit: setUnitState } = useTempUnit()

const chartCanvas          = ref(null)
const consoleRef           = ref(null)
const editingReading       = ref(null)
const showReadingModal     = ref(false)
const showReadingsTable    = ref(false)
const readingBusyId        = ref(null)   // reading id with a save/delete in flight
const showFiringSheet      = ref(false)
const sheetDeletingId      = ref(null)
const showStartModal       = ref(false)
const preselect            = ref(null)   // D1/D2: points + name for the modal
const showTempModal        = ref(false)
const showEndConfirm       = ref(false)
const pendingDeleteFiring  = ref(null)
const renamingFiring       = ref(null)
const allFirings           = ref([])

// MUST match FIRINGS_PAGE_SIZE in server/utils/firingList.js — hasMore is
// inferred from "the last page came back full", so a mismatch makes the
// "Load older" button appear or vanish one page early.
const FIRINGS_PAGE         = 30
const hasMoreFirings       = ref(false)
const loadingOlderFirings  = ref(false)
const firingsOffset        = ref(0)
const selectedFiring       = ref(null)
const currentTemp          = ref(null)   // raw °C
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
const winW                 = ref(1024)

// DEMO (Aug 2026): a demo firing is real rows in the real tables flagged
// is_demo, so every screen behaves exactly as it will for a real firing. It
// occupies the one-active-firing slot deliberately: deleting it before the
// first real firing is the rule we want people to learn on fake data rather
// than at the kiln.
const demoBusy             = ref(false)
const showDemoDeleteConfirm = ref(false)

// Room to break the Cone-down button out of the compact tier's menu?
const coneButtonRoomy = computed(() => !sidebarOpen.value || winW.value >= 1024)

const showNotesModal = ref(false)
const notesSaving    = ref(false)

// Cones carry temp_c: the chart's ruler, the next-cone ETA, and the cone-drop
// sheet all read this one list. Seeded from bootstrap.
const showConeSheet = ref(false)
const coneList      = ref([])
const coneBusy      = ref(false)

const announcements      = ref([])
const pastDueGraceEndsAt = ref(null)

// True until bootstrap resolves. Cleared BEFORE selectFiring — the chart canvas
// only exists in the non-booting branch and selectFiring paints into it.
const booting = ref(true)

async function dismissAnnouncement(id) {
  announcements.value = announcements.value.filter(a => a.id !== id)
  try {
    await $fetch(`/api/announcements/${id}/dismiss`, { method: 'POST' })
  } catch { /* worst case the banner reappears next load */ }
}

let elapsedTickInterval = null

const { init, setSchedule, setReadings, setReductions, setConeLines, setConeDrops, setNowLine, clearNowLine, setUnit: setChartUnit, resetZoom, resize, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  showLabels: true,
  onPointClick: (point) => {
    if (!isLive.value) return
    // point.y is °C; keep it as tempC for the modal to convert.
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, tempC: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))

// Stats return display strings plus raw °C for the console's colour and delta
// logic; coneList feeds nextCone and the atmosphere readout.
const { duration, readingCount, elapsed, rateOfChange, targetRate, targetTemp, rateC, targetRateC, targetTempC, nextCone, atmosphere }
  = useFiringStats(selectedFiring, nowUnix, coneList)

const peakTemp = computed(() => {
  const rs = selectedFiring.value?.readings
  if (!rs?.length) return null
  return rs.reduce((max, r) => r.temperature > max ? r.temperature : max, rs[0].temperature)
})

const openReduction = computed(() =>
  (selectedFiring.value?.reductions ?? []).find(r => r.end_temp === null || r.end_temp === undefined) ?? null
)

const scheduleOffset = computed(() => selectedFiring.value?.schedule_offset ?? 0)

// The ruler is the firing's planned cone pack (or a peak-anchored fallback), so
// it recomputes whenever the plan or the selection changes.
function coneLineOpts() {
  return { pack: selectedFiring.value?.cone_pack ?? [] }
}

function applySchedule(scheduleRows) {
  const rows = scheduleRows ?? selectedFiring.value?.schedule ?? []
  setSchedule(rows, scheduleOffset.value)
  setConeLines(coneList.value, coneLineOpts())
}

function tickNow() {
  nowUnix.value = Math.floor(Date.now() / 1000)
  if (selectedFiring.value?.started_at) setNowLine(selectedFiring.value.started_at)
}

// 402 = the server says access lapsed. This is the only access gate.
function isAccessLapsed(err) {
  return (err?.statusCode ?? err?.status ?? err?.response?.status) === 402
}

// Fallback for the serial load path and for a bootstrap that failed. Safe to
// call repeatedly.
async function ensureCones() {
  if (coneList.value.length) return true
  try {
    coneList.value = await $fetch('/api/cones')
    setConeLines(coneList.value, coneLineOpts())
    return true
  } catch {
    return false
  }
}

async function loadBootstrap() {
  const boot = await $fetch('/api/bootstrap')
  userRole.value = boot.role ?? 'user'
  pastDueGraceEndsAt.value = boot.pastDueGraceEndsAt ?? null
  setUnitState(boot.temp_unit === 'F' ? 'F' : 'C')
  setChartUnit()

  // Before selectFiring: it calls setConeLines with this list.
  coneList.value = boot.cones ?? []

  // boot.firings is the FIRST PAGE. firingsOffset tracks rows consumed from the
  // server list, so it must be set before ensureFiringInList, which can prepend
  // a row that was never part of a page.
  allFirings.value = boot.firings ?? []
  firingsOffset.value = (boot.firings ?? []).length
  hasMoreFirings.value = (boot.firings ?? []).length === FIRINGS_PAGE
  // The active firing can be older than page 1 (restarting doesn't touch
  // created_at), so merge its row in explicitly.
  ensureFiringInList(boot.activeFiring)

  announcements.value = boot.announcements ?? []
  booting.value = false   // canvas must be mounted before selectFiring paints
  if (boot.activeFiring) await selectFiring(boot.activeFiring, boot.activeFiring)
}

async function loadUnit() {
  try {
    const { temp_unit } = await $fetch('/api/preferences')
    setUnitState(temp_unit === 'F' ? 'F' : 'C')
    setChartUnit()
  } catch { /* default 'C' already set */ }
}

onMounted(async () => {
  winW.value = window.innerWidth
  await init()

  try {
    await loadBootstrap()
  } catch (err) {
    // Access lapsed: redirect rather than fall back, since the serial path
    // would just 402 again and blank the page.
    if (isAccessLapsed(err)) {
      return navigateTo('/early-access')  // BETA-TEMP (was /subscribe)
    }
    console.error('Bootstrap failed, falling back to serial load:', err)
    try {
      await loadUnit()
      await ensureCones()
      await refreshFirings()
      booting.value = false
      if (activeFiring.value) await selectFiring(activeFiring.value)
    } catch (err2) {
      if (isAccessLapsed(err2)) {
        return navigateTo('/early-access') // BETA-TEMP (was /subscribe)
      }
      booting.value = false
      throw err2
    }
  }

  booting.value = false

  // D2: ?startSchedule=id from /schedules — the plan was already chosen there,
  // so start immediately rather than reopening the modal.
  if (route.query.startSchedule) {
    const schedId = route.query.startSchedule
    router.replace('/app')
    if (activeFiring.value) {
      toast.show(`"${activeFiring.value.name}" is still firing — only one firing at a time. End it first.`)
      await selectFiring(activeFiring.value)
    } else {
      try {
        const sched = await $fetch(`/api/schedules/${schedId}`)
        await createFiring({
          name:           sched.name,
          notes:          '',
          schedulePoints: (sched.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp })),
          reductions:     (sched.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null, kind: r.kind })),
          conePack:       sched.cone_pack ?? [],
          saveToLibrary:  false,
        })
      } catch (err) {
        toast.show(`Couldn't start: ${err?.data?.message ?? err.message ?? 'error'}`)
      }
    }
  }

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
  winW.value = window.innerWidth
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => resize())
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
  if (isLive.value && !isPaused.value && !elapsedTickInterval) {
    setNowLine(selectedFiring.value.started_at)
    elapsedTickInterval = setInterval(tickNow, 1000)
  }
}

// Resets to page 1; older pages the user had loaded are dropped.
async function refreshFirings() {
  const page = await $fetch('/api/firings', { query: { limit: FIRINGS_PAGE, offset: 0 } })
  allFirings.value = page
  firingsOffset.value = page.length
  hasMoreFirings.value = page.length === FIRINGS_PAGE
  const sel = selectedFiring.value
  if (sel?.started_at && !sel?.ended_at) ensureFiringInList(sel)
}

async function loadOlderFirings() {
  if (loadingOlderFirings.value || !hasMoreFirings.value) return
  loadingOlderFirings.value = true
  try {
    const page = await $fetch('/api/firings', {
      query: { limit: FIRINGS_PAGE, offset: firingsOffset.value },
    })
    firingsOffset.value += page.length
    // Offset paging can repeat a row if one was inserted above mid-session, so
    // dedupe by id rather than trusting the offset.
    const seen = new Set(allFirings.value.map(f => f.id))
    allFirings.value = [...allFirings.value, ...page.filter(f => !seen.has(f.id))]
    hasMoreFirings.value = page.length === FIRINGS_PAGE
  } catch (err) {
    toast.show(`Couldn't load older firings: ${err?.data?.message ?? err.message ?? 'error'}`)
  } finally {
    loadingOlderFirings.value = false
  }
}

// A LIST row carries none of the heavy nested arrays or notes. New heavy
// fields must join this strip list.
function ensureFiringInList(row) {
  if (!row?.id) return
  const listRow = { ...row }
  for (const k of ['schedule', 'readings', 'reductions', 'cone_drops', 'notes']) delete listRow[k]

  const i = allFirings.value.findIndex(f => f.id === listRow.id)
  if (i === -1) allFirings.value = [listRow, ...allFirings.value]
  else allFirings.value[i] = { ...allFirings.value[i], ...listRow }
}

async function selectFiring(f, preloaded = null) {
  stopAllIntervals()
  isLive.value = false
  isPaused.value = false
  currentTemp.value = null
  consoleRef.value?.closeMenu?.()
  clearNowLine()
  // The table binds to selectedFiring.readings; leaving it open across a switch
  // would silently repoint it at another firing's data.
  showReadingsTable.value = false

  let data = preloaded
  // A list row has no `notes` column, so a row passed straight in as preloaded
  // (restartFiring does this) passes the schedule/readings test while missing
  // notes — the notes modal would open empty and saving would blank them.
  if (!data || data.schedule === undefined || data.readings === undefined || data.notes === undefined) {
    data = await $fetch(`/api/firings/${f.id}`)
  }

  selectedFiring.value = data
  await nextTick()
  setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
  // Before setConeDrops: a drop's connector needs its reference line to exist,
  // and the ruler's range comes from the plan just set.
  setConeLines(coneList.value, { pack: data.cone_pack ?? [] })
  setReadings(data.readings ?? [], data.started_at)
  setReductions(data.reductions ?? [], data.started_at)
  setConeDrops(data.cone_drops ?? [], data.started_at)
  requestAnimationFrame(() => resize())

  if (data.readings?.length) {
    currentTemp.value = data.readings.at(-1).temperature
  }

  const isActive = !!(data.started_at && !data.ended_at)

  if (isActive && data.paused_at) {
    isPaused.value = true
    isLive.value = true
    setNowLine(data.started_at)
    return
  }

  if (isActive) {
    isLive.value = true
    setNowLine(data.started_at)
    elapsedTickInterval = setInterval(tickNow, 1000)
  }
}

// payload: { name, notes, schedulePoints, reductions, conePack, saveToLibrary }
async function createFiring(payload) {
  try {
    const firing = await $fetch('/api/firings', {
      method: 'POST',
      body: {
        name: payload.name,
        notes: payload.notes,
        schedulePoints: payload.schedulePoints,
        reductions: payload.reductions,        // [{ startTemp, endTemp|null, kind }] °C
        conePack: payload.conePack ?? [],      // planned witness cones
        startedAt: Math.floor(Date.now() / 1000),
      },
    })

    if (payload.saveToLibrary) {
      try {
        await $fetch('/api/schedules', {
          method: 'POST',
          body: {
            name: payload.name,
            type: 'glaze',
            source: 'custom',
            points: payload.schedulePoints,
            reductions: payload.reductions,
            conePack: payload.conePack ?? [],
          },
        })
        library.value = []   // force refetch on next modal open
      } catch {
        toast.show('Firing started, but saving to library failed.')
      }
    }

    showStartModal.value = false
    preselect.value = null
    refreshFirings()
    await selectFiring({ id: firing.id })
  } catch (err) {
    toast.show(err?.data?.statusMessage ?? err?.data?.message ?? 'Could not start firing.')
  }
}

// ── Demo firing ──────────────────────────────────────────────────────────────
// Both paths hard-navigate rather than patching state. reloadReadings does not
// re-read started_at, fuel or cone_pack, and a demo's whole point is that its
// elapsed clock and backdated history are right — getting that wrong on
// someone's first look at the app is worse than a page load.
function onDemoCreated() {
  window.location.assign('/app')
}

function deleteDemo() {
  showDemoDeleteConfirm.value = true
}

async function confirmDeleteDemo() {
  showDemoDeleteConfirm.value = false
  demoBusy.value = true
  try {
    await $fetch('/api/demo-firing', { method: 'DELETE' })
    window.location.assign('/app')
  } catch (err) {
    toast.show(err?.data?.statusMessage ?? err?.data?.message ?? 'Could not delete the demo.')
    demoBusy.value = false
  }
}

// ── Notes ────────────────────────────────────────────────────────────────────
function openNotes() { showNotesModal.value = true }

async function saveNotes(text) {
  const f = selectedFiring.value
  if (!f) return
  notesSaving.value = true
  try {
    const updated = await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { notes: text } })
    selectedFiring.value = { ...f, notes: updated.notes }
    const i = allFirings.value.findIndex(x => x.id === f.id)
    if (i !== -1) allFirings.value[i] = { ...allFirings.value[i], notes: updated.notes }
    showNotesModal.value = false
    toast.show('Notes saved.', 'success')
  } catch (err) {
    toast.show(`Couldn\u2019t save notes: ${err?.data?.statusMessage ?? err?.data?.message ?? 'Unknown error'}`)
  } finally {
    notesSaving.value = false
  }
}

// ── Readings table ───────────────────────────────────────────────────────────
// Both handlers route through reloadReadings so the chart, currentTemp and the
// stats follow the edit. The table stays open throughout.
async function updateReadingFromTable({ id, temperature }) {
  if (readingBusyId.value) return
  readingBusyId.value = id
  try {
    await $fetch(`/api/readings/${id}`, { method: 'PUT', body: { temperature } })
    await reloadReadings()
  } catch (err) {
    toast.show(`Couldn\u2019t update reading: ${err?.data?.statusMessage ?? err?.data?.message ?? 'Unknown error'}`)
  } finally {
    readingBusyId.value = null
  }
}

async function deleteReadingFromTable(id) {
  if (readingBusyId.value) return
  readingBusyId.value = id
  try {
    await $fetch(`/api/readings/${id}`, { method: 'DELETE' })
    await reloadReadings()
  } catch (err) {
    toast.show(`Couldn\u2019t delete reading: ${err?.data?.statusMessage ?? err?.data?.message ?? 'Unknown error'}`)
  } finally {
    readingBusyId.value = null
  }
}

// ── Cone drops ───────────────────────────────────────────────────────────────
// Timestamp and temp snapshot happen server-side; the returned row merges in.
async function openConeSheet() {
  if (!(await ensureCones())) {
    toast.show('Couldn\u2019t load the cone list.')
    return
  }
  showConeSheet.value = true
}

async function logConeDrop(coneName) {
  const f = selectedFiring.value
  if (!f) return
  coneBusy.value = true
  try {
    const created = await $fetch(`/api/firings/${f.id}/cones`, {
      method: 'POST',
      body: { cone: coneName },
    })
    selectedFiring.value = { ...f, cone_drops: [...(f.cone_drops ?? []), created] }
    setConeDrops(selectedFiring.value.cone_drops, f.started_at)
    toast.show(`Cone ${coneName} down.`, 'success')
  } catch (err) {
    toast.show(err?.data?.statusMessage ?? err?.data?.message ?? 'Could not log cone drop.')
  } finally {
    coneBusy.value = false
  }
}

async function removeConeDrop(id) {
  const f = selectedFiring.value
  if (!f) return
  coneBusy.value = true
  try {
    await $fetch(`/api/cone-drops/${id}`, { method: 'DELETE' })
    selectedFiring.value = { ...f, cone_drops: (f.cone_drops ?? []).filter(d => d.id !== id) }
    setConeDrops(selectedFiring.value.cone_drops, f.started_at)
  } catch (err) {
    toast.show(err?.data?.statusMessage ?? err?.data?.message ?? 'Could not remove cone drop.')
  } finally {
    coneBusy.value = false
  }
}

// ── Firing lifecycle ─────────────────────────────────────────────────────────
async function confirmEndFiring() {
  showEndConfirm.value = false
  if (!activeFiring.value) return
  const id = activeFiring.value.id
  const updated = await $fetch(`/api/firings/${id}`, {
    method: 'PUT',
    body: { endedAt: Math.floor(Date.now() / 1000) },
  })
  stopAllIntervals()
  clearNowLine()
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
  const points = (f.schedule ?? []).map(p => ({
    offsetMinutes: p.offset_minutes,
    targetTemp:    p.target_temp,
  }))
  preselect.value = { name: f.name, schedulePoints: points, conePack: f.cone_pack ?? [] }
  openStartModal()
}

function saveAsSchedule(f) { router.push(`/schedules/new?fromFiring=${f.id}`) }

function onExportFiring(f) {
  const firing = f ?? selectedFiring.value
  if (!firing) return
  const full = (firing.readings !== undefined || firing.schedule !== undefined)
    ? firing
    : selectedFiring.value
  exportFiring(full)
  toast.show('Firing exported.', 'success')
}

// Start/end an atmosphere period at the current temperature (°C).
async function onToggleReduction() {
  const f = selectedFiring.value
  if (!f || !isLive.value) return

  const temp = currentTemp.value
  if (temp === null || temp === undefined) {
    toast.show('Log a temperature reading first, then mark reduction.')
    return
  }

  try {
    if (openReduction.value) {
      const updated = await $fetch(`/api/reductions/${openReduction.value.id}`, {
        method: 'PUT',
        body: { endTemp: temp },
      })
      const list = (f.reductions ?? []).map(r => r.id === updated.id ? updated : r)
      selectedFiring.value = { ...f, reductions: list }
      toast.show('Reduction ended.', 'success')
    } else {
      const created = await $fetch(`/api/firings/${f.id}/reductions`, {
        method: 'POST',
        body: { startTemp: temp, kind: 'reduction' },
      })
      selectedFiring.value = { ...f, reductions: [...(f.reductions ?? []), created] }
      toast.show('Reduction started.', 'success')
    }
    setReductions(selectedFiring.value.reductions, selectedFiring.value.started_at)
  } catch (err) {
    toast.show(err?.data?.statusMessage ?? err?.data?.message ?? 'Could not update reduction.')
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
  setNowLine(f.started_at)
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
  setNowLine(f.started_at)
  elapsedTickInterval = setInterval(tickNow, 1000)
  toast.show(`Resumed — plan shifted ${gapMins} min to match.`, 'success')
}

function openRecalibrate() { showRecalibrateInfo.value = true }

// Slides the plan so it starts from the current temperature, keeping ramp
// rates intact.
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
  setNowLine(f.started_at)
  showRecalibrateInfo.value = false
  toast.show('Plan recalibrated to current temperature.', 'success')
}

// Desktop delete confirms via ConfirmDialog; the mobile sheet has its own
// two-tap and calls sheetDeleteFiring instead.
function deleteFiring(f) {
  pendingDeleteFiring.value = f
}

async function performDeleteFiring(f) {
  pendingDeleteFiring.value = null
  if (!f?.id) return
  try {
    await $fetch(`/api/firings/${f.id}`, { method: 'DELETE' })
    if (selectedFiring.value?.id === f.id) {
      stopAllIntervals()
      clearNowLine()
      selectedFiring.value = currentTemp.value = null
      isLive.value = isPaused.value = false
      showReadingsTable.value = false   // its data source just went away
    }
    await refreshFirings()
  } catch (err) {
    toast.show(`Couldn\u2019t delete: ${err?.data?.statusMessage ?? err?.data?.message ?? 'Unknown error'}`)
  }
}

// The sheet stays open so a run of deletes doesn't mean reopening it each time.
async function sheetDeleteFiring(f) {
  if (sheetDeletingId.value) return
  sheetDeletingId.value = f.id
  try {
    await performDeleteFiring(f)
  } finally {
    sheetDeletingId.value = null
  }
}

function onFiringRenamed(updated) {
  renamingFiring.value = null
  if (selectedFiring.value?.id === updated.id) {
    selectedFiring.value = { ...selectedFiring.value, name: updated.name }
  }
  const i = allFirings.value.findIndex(f => f.id === updated.id)
  if (i !== -1) allFirings.value[i] = { ...allFirings.value[i], name: updated.name }
}

async function openStartModal() {
  // The server enforces one active firing (409), but guard the button so the
  // user never fills out the modal only to be rejected. A demo occupies that
  // same slot, so it gets its own message: "end it" is wrong advice for
  // something that should be deleted.
  if (activeFiring.value) {
    if (activeFiring.value.is_demo) {
      toast.show('Delete the demo firing first — it\u2019s taking the active slot.')
    } else {
      toast.show(`"${activeFiring.value.name}" is still firing — only one firing at a time. End it first.`)
    }
    selectFiring(activeFiring.value)
    return
  }
  if (!library.value.length) library.value = await $fetch('/api/schedules')
  showStartModal.value = true
}

// ── Readings ─────────────────────────────────────────────────────────────────
function openLogReading()    { editingReading.value = null; showReadingModal.value = true }
function closeReadingModal() { showReadingModal.value = false; editingReading.value = null }

// payload.temperature arrives as °C (the modal converts before emit).
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

// Does NOT re-read started_at, fuel or cone_pack — a hard reload is still
// needed after any server-side change to firing metadata.
async function reloadReadings() {
  if (!selectedFiring.value) return
  try {
    const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)

    // The firing may have been ended server-side (auto-end, another device)
    // while this tab slept. Adopt the full server state or the UI shows Live
    // forever.
    if (data.ended_at && !selectedFiring.value.ended_at) {
      stopAllIntervals()
      clearNowLine()
      isLive.value = isPaused.value = false
      selectedFiring.value = data
      setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
      setConeLines(coneList.value, { pack: data.cone_pack ?? [] })
      setReadings(data.readings ?? [], data.started_at)
      setReductions(data.reductions ?? [], data.started_at)
      setConeDrops(data.cone_drops ?? [], data.started_at)
      refreshFirings()          // sidebar: Live → Finished
      return
    }

    selectedFiring.value.readings   = data.readings
    selectedFiring.value.schedule   = data.schedule
    selectedFiring.value.reductions = data.reductions ?? selectedFiring.value.reductions
    selectedFiring.value.cone_drops = data.cone_drops ?? selectedFiring.value.cone_drops
    setReadings(data.readings, selectedFiring.value.started_at)
    setConeLines(coneList.value, coneLineOpts())
    setReductions(selectedFiring.value.reductions ?? [], selectedFiring.value.started_at)
    setConeDrops(selectedFiring.value.cone_drops ?? [], selectedFiring.value.started_at)
    if (isLive.value && !isPaused.value && selectedFiring.value.started_at) {
      setNowLine(selectedFiring.value.started_at)
    }
    if (!isSaving.value && data.readings?.length) {
      currentTemp.value = data.readings.at(-1).temperature
    }
  } catch (err) {
    console.error('Failed to reload readings:', err)
  }
}
</script>

<style>
/* Shared controls (.btn-primary, .input, etc.) live in
   app/assets/css/tailwind.css under @layer components — defining them in this
   page-level block meant they only existed while /app was mounted. Only the
   toast transition is page-specific. */
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>