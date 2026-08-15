<!-- File: app/pages/app.vue -->
<template>
  <!-- MOBILE (Aug 2026): h-screen is 100vh, which on iOS EXCLUDES Safari's
       URL bar — the bottom of the console and the chart's Reset-zoom button
       sat underneath it. 100dvh tracks the actually-visible height. Applied
       inline rather than as a class so it reliably beats h-screen; browsers
       without dvh drop the declaration and fall back to 100vh. -->
  <div class="flex flex-col h-screen overflow-hidden font-serif bg-parchment" style="height:100dvh">

    <!-- ── Header ───────────────────────────────────────────────────────────
         MOBILE (Aug 2026): was a hand-rolled row of brand + FeedbackButton +
         TempUnitToggle + UserMenu with nothing allowed to shrink. Their
         combined min-content exceeded 375px, which is what pushed the page
         wider than the screen. AppNav owns the layout now — it drops the
         wordmark on narrow screens and renders the section tabs on md+. The
         hamburger stays here because on THIS page it opens the firing list,
         not navigation; the sidebar takes over at sm, so it hides there. -->
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
        <!-- FEEDBACK: label renders lg+ only; collapses to an icon on mobile. -->
        <FeedbackButton />
        <TempUnitToggle size="md" @change="setChartUnit" />
      </template>
    </AppNav>

    <!-- ── Body ─────────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden min-w-0">

      <!-- Sidebar — desktop only -->
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

      <!-- Main content -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">


          <PastDueBanner :grace-ends-at="pastDueGraceEndsAt" />

          <!-- ANNOUNCEMENTS: admin-pushed banners (from /api/bootstrap) -->
          <AnnouncementBanner :announcements="announcements" @dismiss="dismissAnnouncement" />


        <!-- ── Booting — /api/bootstrap in flight ── -->
        <!-- UX (Aug 2026): shown instead of the empty state so a slow first
             load never reads as "you have no firings". NOTE: `booting` is
             cleared BEFORE selectFiring runs (see loadBootstrap) — the chart
             canvas lives in the v-else branch below and must be mounted
             before the chart paints into it. -->
        <div v-if="booting" class="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted px-6">
          <span class="w-7 h-7 border-2 border-parchment-3 border-t-celadon rounded-full animate-spin"/>
          <p class="text-sm font-semibold">Loading your firings…</p>
        </div>

        <!-- ── Empty state — nothing selected ── -->
        <FiringEmptyState
          v-else-if="!selectedFiring"
          :recent-firing="pastFirings[0] ?? null"
          :active-firing="activeFiring"
          @start="openStartModal"
          @browse-schedules="goToSchedules"
          @select-recent="selectFiring"
        />

        <!-- ── A firing is selected ── -->
        <template v-else>

          <!-- Console (live) or Review (ended) -->
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

          <!-- G6: auto-ended banner -->
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

    <!-- ── Recalibrate modal ─────────────────────────────────────────────────── -->
    <!-- SAFE AREA (Aug 2026): every bottom sheet below pads past the iPhone's
         home indicator. Without it the last button sits under the gesture bar
         and is genuinely hard to hit. -->
    <Teleport to="body">
      <div v-if="showRecalibrateInfo" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(26,18,8,0.55)" @click.self="showRecalibrateInfo = false">
        <div class="bg-parchment sm:bg-white w-full sm:w-80 sm:rounded-2xl rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 sm:border sm:border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">
          <p class="text-sm font-bold text-ink mb-1.5">When to recalibrate</p>
          <p class="text-sm text-ink-muted leading-relaxed">Use this when your kiln has fallen behind the planned curve — a weak burner, a stall, or after a gas-out. It slides the rest of your schedule to start from your <strong>current temperature</strong>, keeping every ramp rate intact. Your firing just finishes later.</p>
          <div class="flex gap-2 mt-4">
            <button class="flex-1 py-2.5 bg-celadon hover:bg-celadon-dark text-white text-sm font-bold rounded-lg transition-colors" @click="recalibrate">Recalibrate now</button>
            <button class="px-4 py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg hover:bg-parchment-2 transition-colors" @click="showRecalibrateInfo = false">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Notes modal ───────────────────────────────────────────────────────── -->
    <!-- Triggered from FiringConsole's overflow menu (@notes). firings.notes
         already existed server-side (POST /api/firings + PUT /api/firings/:id
         both accept it); this is the UI that was missing. -->
    <Teleport to="body">
      <div v-if="showNotesModal" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(26,18,8,0.6)" @click.self="showNotesModal = false">
        <div class="bg-parchment w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 flex flex-col gap-3 border border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">
          <div class="flex flex-col gap-0.5">
            <h2 class="text-base font-bold text-ink">Notes</h2>
            <p class="text-xs text-ink-muted truncate">{{ selectedFiring?.name }}</p>
          </div>
          <textarea
            v-model="notesDraft"
            rows="7"
            maxlength="5000"
            class="input !py-2 resize-y leading-relaxed"
            placeholder="Load, atmosphere, glaze tests, anything worth remembering…"
          />
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] text-ink-faint tabular-nums shrink-0">{{ notesDraft.length }}/5000</span>
            <div class="flex gap-2 shrink-0">
              <button class="btn-ghost !py-2" :disabled="notesSaving" @click="showNotesModal = false">Cancel</button>
              <button class="btn-primary !py-2" :disabled="notesSaving" @click="saveNotes">
                {{ notesSaving ? 'Saving…' : 'Save notes' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- CONE DROPS: one-tap witness-cone logging -->
    <ConeDropSheet
      :open="showConeSheet"
      :cones="coneList"
      :drops="selectedFiring?.cone_drops ?? []"
      :started-at="selectedFiring?.started_at ?? 0"
      :busy="coneBusy"
      @close="showConeSheet = false"
      @log="logConeDrop"
      @remove="removeConeDrop"
    />

    <!-- READINGS TABLE (Aug 2026): the dependable way to fix a mistyped
         reading. The chart's tap-a-point path still works but is unreliable on
         a phone, which is what prompted this. Stays open across edits. -->
    <ReadingsTableModal
      :open="showReadingsTable"
      :readings="selectedFiring?.readings ?? []"
      :started-at="selectedFiring?.started_at ?? 0"
      :busy-id="readingBusyId"
      @close="showReadingsTable = false"
      @update="updateReadingFromTable"
      @delete="deleteReadingFromTable"
    />

    <!-- ── End firing confirm modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showEndConfirm" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(26,18,8,0.6)" @click.self="showEndConfirm = false">
        <div class="bg-parchment w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 flex flex-col gap-4 border border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">
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

    <!-- ── Mobile firing sidebar (sheet) ─────────────────────────────────────── -->
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

    <!-- D1/D2: preselect prop wired; cleared on close so next open starts fresh -->
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

    <!-- G4: delete-firing confirm (desktop path) -->
    <ConfirmDialog
      :open="!!pendingDeleteFiring"
      :title="`Delete ${pendingDeleteFiring?.name ?? 'firing'}?`"
      message="This permanently removes the firing, its schedule, and every logged reading. This cannot be undone."
      confirm-label="Delete firing"
      @confirm="performDeleteFiring(pendingDeleteFiring)"
      @cancel="pendingDeleteFiring = null"
    />

    <!-- Rename firing — triggered per-row from the sidebar (renamingFiring holds
         the target). -->
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

// ARCH (Aug 2026): role arrives in the /api/bootstrap payload (server-verified
// via useServerUser) and is shared with UserMenu through this state — the
// browser→Supabase profiles queries in middleware + UserMenu are deleted.
const userRole = useState('user-role', () => null)

const toast  = useToast()
const router = useRouter()
const route  = useRoute()          // D2: needed for ?startSchedule param

const { exportFiring } = useFiringExport()   // Package 6

// G1: hydrate the shared unit from the server on load (now via /api/bootstrap).
// The toggle UI lives in TempUnitToggle; app.vue only seeds the initial value
// and repaints the chart when the toggle emits `change`.
const { setUnit: setUnitState } = useTempUnit()

const chartCanvas          = ref(null)
const consoleRef           = ref(null)
const editingReading       = ref(null)
const showReadingModal     = ref(false)
const showReadingsTable    = ref(false)  // tabular reading editor
const readingBusyId        = ref(null)   // reading id with a save/delete in flight
const showFiringSheet      = ref(false)
const sheetDeletingId      = ref(null)   // firing id with a delete request in flight
const showStartModal       = ref(false)
const preselect            = ref(null) // D1/D2: points + name to pre-load into modal
const showTempModal        = ref(false)
const showEndConfirm       = ref(false)
const pendingDeleteFiring  = ref(null) // G4: firing awaiting delete confirmation
const renamingFiring       = ref(null) // firing being renamed (sidebar-triggered); open when non-null
const allFirings           = ref([])
// LAZY LIST (Aug 2026): the firings list is paged. MUST match
// FIRINGS_PAGE_SIZE in server/utils/firingList.js — `hasMoreFirings` is
// inferred from "the last page came back full", so a mismatch makes the
// "Load older" button appear or vanish one page early.
const FIRINGS_PAGE         = 30
const hasMoreFirings       = ref(false)
const loadingOlderFirings  = ref(false)
const firingsOffset        = ref(0)
const selectedFiring       = ref(null)
const currentTemp          = ref(null)  // raw °C
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
const winW                 = ref(1024)   // CONE DROPS: viewport width, kept fresh by onWindowResize

// CONE DROPS: is there room to break the Cone-down button out of the ⋮ menu in
// the compact (below-lg) console tier? lg+ always shows it; in between, only
// when the sidebar isn't eating the width (iPad portrait with sidebar closed).
const coneButtonRoomy = computed(() => !sidebarOpen.value || winW.value >= 1024)

// Notes modal (firings.notes — CRUD already exists on the API)
const showNotesModal = ref(false)
const notesDraft     = ref('')
const notesSaving    = ref(false)

// CONE DROPS (Aug 2026)
const showConeSheet = ref(false)
const coneList      = ref([])     // fetched once from /api/cones
const coneBusy      = ref(false)

// ANNOUNCEMENTS (Aug 2026): live banners from bootstrap; dismiss is optimistic.
const announcements = ref([])

// G8 (Aug 2026): past_due grace deadline (ISO string) from bootstrap; null
// unless the user is past_due. Feeds PastDueBanner, which no longer does its
// own auth.getUser() + profiles query.
const pastDueGraceEndsAt = ref(null)

// UX (Aug 2026): true until /api/bootstrap resolves. Without this the page
// renders FiringEmptyState during the wait, which actively lies to the user
// ("no firings yet") while their firings are still loading — worse than a
// spinner. Gates the main column only; header/sidebar chrome renders straight
// away so the app feels present.
// IMPORTANT: clear this BEFORE calling selectFiring — the chart canvas only
// exists in the non-booting branch, and selectFiring paints into it.
const booting = ref(true)

async function dismissAnnouncement(id) {
  announcements.value = announcements.value.filter(a => a.id !== id)
  try {
    await $fetch(`/api/announcements/${id}/dismiss`, { method: 'POST' })
  } catch {
    // Non-fatal: worst case the banner reappears next load.
  }
}

let elapsedTickInterval = null

// NOW-LINE + G1: setUnit pulled from the chart composable to repaint on toggle.
const { init, setSchedule, setReadings, setReductions, setConeDrops, setNowLine, clearNowLine, setUnit: setChartUnit, resetZoom, resize, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  showLabels: true,
  onPointClick: (point) => {
    if (!isLive.value) return
    // point.y is the °C data value; keep it as tempC for the modal to convert.
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, tempC: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))

// G1: stats now also return raw °C values (rateC/targetRateC/targetTempC) for
// FiringConsole's colour + delta logic, plus display strings/numbers.
const { duration, readingCount, elapsed, rateOfChange, targetRate, targetTemp, rateC, targetRateC, targetTempC }
  = useFiringStats(selectedFiring, nowUnix)

const peakTemp = computed(() => {
  const rs = selectedFiring.value?.readings
  if (!rs?.length) return null
  return rs.reduce((max, r) => r.temperature > max ? r.temperature : max, rs[0].temperature)
})

// G11: the open (in-progress) reduction period, if any
const openReduction = computed(() =>
  (selectedFiring.value?.reductions ?? []).find(r => r.end_temp === null || r.end_temp === undefined) ?? null
)

const scheduleOffset = computed(() => selectedFiring.value?.schedule_offset ?? 0)

function applySchedule(scheduleRows) {
  const rows = scheduleRows ?? selectedFiring.value?.schedule ?? []
  setSchedule(rows, scheduleOffset.value)
}

// NOW-LINE: advance the clock and the line together each second.
function tickNow() {
  nowUnix.value = Math.floor(Date.now() / 1000)
  if (selectedFiring.value?.started_at) setNowLine(selectedFiring.value.started_at)
}

// ARCH (Aug 2026): 402 = the server's useServerUser says access lapsed. This
// is now the ONLY access gate — the middleware's client-side profiles check
// was deleted — so the mount path must recognise it and redirect instead of
// treating it as a load failure.
function isAccessLapsed(err) {
  return (err?.statusCode ?? err?.status ?? err?.response?.status) === 402
}

async function loadBootstrap() {
  const boot = await $fetch('/api/bootstrap')
  userRole.value = boot.role ?? 'user'
  pastDueGraceEndsAt.value = boot.pastDueGraceEndsAt ?? null
  setUnitState(boot.temp_unit === 'F' ? 'F' : 'C')
  setChartUnit()

  // LAZY LIST (Aug 2026): boot.firings is now the FIRST PAGE, not everything.
  // hasMore is inferred from "the page came back full" — no COUNT(*) needed.
  // firingsOffset tracks rows CONSUMED from the server list; it must be set
  // before ensureFiringInList, which can prepend a row that was never part of
  // a page and would otherwise inflate the next offset.
  allFirings.value = boot.firings ?? []
  firingsOffset.value = (boot.firings ?? []).length
  hasMoreFirings.value = (boot.firings ?? []).length === FIRINGS_PAGE
  // The active firing can be older than page 1 (restarting an old firing makes
  // it active without touching created_at), so merge its row in explicitly —
  // otherwise the `activeFiring` computed finds nothing and the app believes
  // no firing is running.
  ensureFiringInList(boot.activeFiring)

  announcements.value = boot.announcements ?? []   // ANNOUNCEMENTS
  // UX (Aug 2026): drop the skeleton BEFORE selectFiring so the chart canvas
  // is mounted by the time the chart paints into it.
  booting.value = false
  if (boot.activeFiring) await selectFiring(boot.activeFiring, boot.activeFiring)
}

// Legacy fallback — kept intentionally; also used by other error paths.
async function loadUnit() {
  try {
    const { temp_unit } = await $fetch('/api/preferences')
    setUnitState(temp_unit === 'F' ? 'F' : 'C')
    setChartUnit()
  } catch { /* default 'C' already set */ }
}

onMounted(async () => {
  winW.value = window.innerWidth   // CONE DROPS: seed before first paint decisions
  await init()

  try {
    await loadBootstrap()
  } catch (err) {
    // ARCH (Aug 2026): access lapsed → redirect, don't fall back (the serial
    // path would just 402 again on /api/firings and blank the page). The
    // skeleton stays up through the redirect — no flash of empty app.
    if (isAccessLapsed(err)) {
      return navigateTo('/early-access')  // BETA-TEMP (was /subscribe)
    }
    console.error('Bootstrap failed, falling back to serial load:', err)
    try {
      await loadUnit()
      await refreshFirings()
      booting.value = false   // as above: canvas must exist before selectFiring
      if (activeFiring.value) await selectFiring(activeFiring.value)
    } catch (err2) {
      if (isAccessLapsed(err2)) {
        return navigateTo('/early-access') // BETA-TEMP (was /subscribe)
      }
      booting.value = false   // real failure: drop the skeleton, show the page
      throw err2
    }
  }

  // Belt and braces — every success path has already cleared this.
  booting.value = false

  // D2: ?startSchedule=id from the schedules page — start the firing
  // immediately. The schedule was already chosen there; don't make the user
  // pick again via the modal. Carries the schedule's points + planned reductions.
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
          reductions:     (sched.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null })),
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
  winW.value = window.innerWidth   // CONE DROPS
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

// Resets to page 1. Any older pages the user had loaded are dropped — they're
// one click away again, and the alternative (re-fetching every loaded page on
// each mutation) costs more than it saves.
async function refreshFirings() {
  const page = await $fetch('/api/firings', { query: { limit: FIRINGS_PAGE, offset: 0 } })
  allFirings.value = page
  firingsOffset.value = page.length
  hasMoreFirings.value = page.length === FIRINGS_PAGE
  // A restarted old firing can be active but off page 1 — keep its row.
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
    // Offset paging can still repeat a row if one was inserted above
    // mid-session. Dedupe by id rather than trusting the offset.
    const seen = new Set(allFirings.value.map(f => f.id))
    allFirings.value = [...allFirings.value, ...page.filter(f => !seen.has(f.id))]
    hasMoreFirings.value = page.length === FIRINGS_PAGE
  } catch (err) {
    toast.show(`Couldn't load older firings: ${err?.data?.message ?? err.message ?? 'error'}`)
  } finally {
    loadingOlderFirings.value = false
  }
}

function ensureFiringInList(row) {
  if (!row?.id) return
  // Strip the heavy nested arrays and `notes` — a LIST row carries neither, and
  // holding a full firing's readings in the sidebar list is exactly what this
  // refactor set out to stop.
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
  // The table is bound to selectedFiring.readings; leaving it open across a
  // firing switch would silently repoint it at a different firing's data.
  showReadingsTable.value = false

  let data = preloaded
  // LAZY LIST: a list row now has NO `notes` column, so a row passed straight
  // in as `preloaded` (restartFiring does this) looks complete by the old
  // schedule/readings test while missing notes entirely — the notes modal
  // would then open empty and saving would blank real notes.
  if (!data || data.schedule === undefined || data.readings === undefined || data.notes === undefined) {
    data = await $fetch(`/api/firings/${f.id}`)
  }

  selectedFiring.value = data
  await nextTick()
  setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
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

// payload: { name, notes, schedulePoints, reductions, saveToLibrary }
async function createFiring(payload) {
  try {
    const firing = await $fetch('/api/firings', {
      method: 'POST',
      body: {
        name: payload.name,
        notes: payload.notes,
        schedulePoints: payload.schedulePoints,
        reductions: payload.reductions,        // [{ startTemp, endTemp|null }] °C
        startedAt: Math.floor(Date.now() / 1000),
      },
    })

    // Optional: also persist the plan as a reusable library schedule.
    if (payload.saveToLibrary) {
      try {
        await $fetch('/api/schedules', {
          method: 'POST',
          body: {
            name: payload.name,
            type: 'glaze',
            source: 'custom',
            points: payload.schedulePoints,
            reductions: payload.reductions,    // [{ startTemp, endTemp|null }] °C
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

// ── Notes ────────────────────────────────────────────────────────────────────
// Opened from FiringConsole's overflow menu. The draft is seeded from the
// selected firing each time the modal opens, so cancelling discards cleanly.
function openNotes() {
  notesDraft.value = selectedFiring.value?.notes ?? ''
  showNotesModal.value = true
}

async function saveNotes() {
  const f = selectedFiring.value
  if (!f) return
  notesSaving.value = true
  try {
    // Empty string → null so the DB doesn't hold blank strings (the server
    // does the same coercion; sending null is just explicit).
    const updated = await $fetch(`/api/firings/${f.id}`, {
      method: 'PUT',
      body: { notes: notesDraft.value.trim() || null },
    })
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
// stats all follow the edit. The table stays OPEN throughout: correcting
// readings is usually a run of edits, not one, and closing it after each would
// repeat the sidebar-delete mistake.
async function updateReadingFromTable({ id, temperature }) {
  if (readingBusyId.value) return   // ignore taps while one is in flight
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
// One-tap logging via ConeDropSheet. Timestamp + temp snapshot happen
// server-side; the returned row is merged into selectedFiring and the chart
// marker set is refreshed.
async function openConeSheet() {
  if (!coneList.value.length) {
    try { coneList.value = await $fetch('/api/cones') }
    catch { toast.show('Couldn\u2019t load the cone list.'); return }
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

// D1: populate preselect from the firing's saved schedule, then open modal
function fireAgain(f) {
  const points = (f.schedule ?? []).map(p => ({
    offsetMinutes: p.offset_minutes,
    targetTemp:    p.target_temp,
  }))
  preselect.value = { name: f.name, schedulePoints: points }
  openStartModal()
}

function saveAsSchedule(f) { router.push(`/schedules/new?fromFiring=${f.id}`) }

// Package 6: CSV export (unit handled inside useFiringExport).
function onExportFiring(f) {
  const firing = f ?? selectedFiring.value
  if (!firing) return
  const full = (firing.readings !== undefined || firing.schedule !== undefined)
    ? firing
    : selectedFiring.value
  exportFiring(full)
  toast.show('Firing exported.', 'success')
}

// G11: start/end a reduction period at the current temperature (°C).
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
        body: { startTemp: temp },
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
  setNowLine(f.started_at)
  showRecalibrateInfo.value = false
  toast.show('Schedule recalibrated to current temperature.', 'success')
}

// G4: desktop delete now confirms first (mobile sheet keeps its own two-tap)
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

// Apply a rename returned by RenameFiringModal (firing may not be the selected one)
function onFiringRenamed(updated) {
  renamingFiring.value = null
  if (selectedFiring.value?.id === updated.id) {
    selectedFiring.value = { ...selectedFiring.value, name: updated.name }
  }
  const i = allFirings.value.findIndex(f => f.id === updated.id)
  if (i !== -1) allFirings.value[i] = { ...allFirings.value[i], name: updated.name }
}

async function openStartModal() {
  // G5: one firing at a time. The server enforces this (partial unique index
  // → 409), but guard the button so the user never fills out the modal only to
  // be rejected. Surface the active firing instead of opening a doomed form.
  if (activeFiring.value) {
    toast.show(`"${activeFiring.value.name}" is still firing — only one firing at a time. End it first.`)
    selectFiring(activeFiring.value)
    return
  }
  if (!library.value.length) library.value = await $fetch('/api/schedules')  // G9: unified endpoint (was /api/library)
  showStartModal.value = true
}

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

async function reloadReadings() {
  if (!selectedFiring.value) return
  try {
    const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)

    // The firing may have been ended server-side (pg_cron auto-end, or another
    // device) while this tab was asleep. Adopt the full server state, not just
    // the readings — otherwise the UI shows Live forever.
    if (data.ended_at && !selectedFiring.value.ended_at) {
      stopAllIntervals()
      clearNowLine()
      isLive.value = isPaused.value = false
      selectedFiring.value = data
      setSchedule(data.schedule ?? [], data.schedule_offset ?? 0)
      setReadings(data.readings ?? [], data.started_at)
      setReductions(data.reductions ?? [], data.started_at)
      setConeDrops(data.cone_drops ?? [], data.started_at)
      refreshFirings()          // sidebar: Live → Finished
      return
    }

    selectedFiring.value.readings = data.readings
    selectedFiring.value.schedule = data.schedule
    selectedFiring.value.reductions = data.reductions ?? selectedFiring.value.reductions
    selectedFiring.value.cone_drops = data.cone_drops ?? selectedFiring.value.cone_drops
    setReadings(data.readings, selectedFiring.value.started_at)
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

// G4: the sheet has its own two-tap confirm, so this skips the desktop
// ConfirmDialog and deletes directly. The sheet stays OPEN so a run of
// deletes doesn't mean reopening it between each one.
async function sheetDeleteFiring(f) {
  if (sheetDeletingId.value) return   // ignore taps while one is in flight
  sheetDeletingId.value = f.id
  try {
    await performDeleteFiring(f)
  } finally {
    sheetDeletingId.value = null
  }
}
</script>

<style>
/* SHARED CONTROLS MOVED (Aug 2026): .btn-primary, .btn-danger, .btn-ghost,
   .input and .label used to be defined here. Because this is a page-level
   <style> block, they only existed while /app was mounted — which is why the
   same class names did nothing on /account, /schedules and the admin pages.
   They now live in app/assets/css/tailwind.css under @layer components.

   NOTE: the definitions there must use the CELADON variants to match what this
   page rendered before the move (.btn-primary → bg-celadon, .input focus ring
   → celadon), not flame.

   Only the toast transition is page-specific, so only it stays. */
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translate(-50%, 1rem); }
</style>