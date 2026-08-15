<!-- app/components/ReadingsTableModal.vue -->
<!--
  Tabular editor for a firing's logged readings. Exists because the chart's
  tap-a-point-to-edit path is unreliable on a phone: the hit area is a few
  pixels, points overlap when readings are close together, and at a hot kiln
  with gloves on it mostly misses.

  MOBILE-FIRST: full-height sheet, one row in edit state at a time, every target
  >= 44px, dvh height cap, safe-area padding. Desktop gets the same sheet
  centred and capped at 480px -- there is no separate desktop layout, because
  this is a phone-at-the-kiln feature that desktop merely also has.

  RATE COLUMN IS THE POINT: the reason to open this is almost always a typo
  (900 typed for 90). An absolute value is hard to eyeball as wrong; the RATE
  between neighbours is not. Rows whose rate exceeds OUTLIER_C_HR get a "check"
  flag -- advisory only, never blocks saving, since a real gas kiln does swing.

  TEMPERATURE ONLY: PUT /api/readings/:id accepts a temperature. Timestamps are
  deliberately NOT editable here -- readings upsert on (firing_id, timestamp),
  so an edited timestamp could silently overwrite a different reading. A
  wrong-time reading is deleted and re-logged instead.

  UNITS: rows display in the user's unit via displayTemp; the input is typed in
  that unit and converted with toCelsius before emitting. Everything leaving
  this component is °C, matching ManualReadingModal's boundary rule. The RATE
  column is an exception and always reads °C/hr: it is a diagnostic for
  spotting typos, not a value to fire by, and the console already carries the
  unit-aware rate.
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[75] flex flex-col justify-end sm:items-center sm:justify-center font-serif"
      style="background:rgba(26,18,8,0.6)"
      @click.self="$emit('close')"
    >
      <div
        class="bg-parchment w-full sm:w-[480px] rounded-t-2xl sm:rounded-2xl flex flex-col border border-parchment-3 overflow-hidden"
        style="max-height:88vh; max-height:min(88vh, 88dvh); box-shadow:0 -8px 40px rgba(26,18,8,0.15)"
      >
        <!-- Header -->
        <div class="shrink-0">
          <div class="flex justify-center pt-3 pb-1 sm:hidden"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-parchment-3">
            <div class="min-w-0">
              <h2 class="text-base font-bold text-ink">Readings</h2>
              <p class="text-[11px] text-ink-muted tabular-nums">
                {{ rows.length }} logged<span v-if="outlierCount"> · {{ outlierCount }} to check</span>
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                class="px-2.5 py-2 min-h-[44px] rounded-lg text-[11px] font-bold text-ink-muted active:bg-parchment-2 transition-colors"
                @click="newestFirst = !newestFirst"
              >{{ newestFirst ? 'Newest' : 'Oldest' }}</button>
              <button
                class="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink-muted active:bg-parchment-2 transition-colors"
                aria-label="Close"
                @click="$emit('close')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Rows -->
        <ul class="flex-1 overflow-y-auto divide-y divide-parchment-3">
          <li v-if="!rows.length" class="px-4 py-10 text-sm text-ink-muted text-center">
            No readings logged yet
          </li>

          <li v-for="r in rows" :key="r.id" :class="editingId === r.id ? 'bg-parchment-2' : ''">

            <!-- ── Display state ── -->
            <button
              v-if="editingId !== r.id"
              class="w-full flex items-center gap-3 px-4 py-3 min-h-[60px] text-left active:bg-parchment-2 transition-colors"
              @click="startEdit(r)"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-ink tabular-nums">{{ r.elapsedLabel }}</p>
                <p class="text-[11px] text-ink-muted tabular-nums truncate">
                  {{ r.clock }}
                  <span v-if="r.rateLabel"> · <span :class="r.outlier ? 'text-amber-700 font-bold' : ''">{{ r.rateLabel }}</span></span>
                </p>
              </div>
              <span
                v-if="r.outlier"
                class="shrink-0 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200"
              >check</span>
              <span class="text-xl font-bold tabular-nums text-ink shrink-0">
                {{ r.display }}<span class="text-xs font-medium text-ink-faint">{{ unitLabel }}</span>
              </span>
              <svg class="w-4 h-4 text-parchment-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <!-- ── Edit state ──
                 Replaces the row IN PLACE rather than opening a nested modal: a
                 sheet on top of a sheet hides the surrounding readings, which
                 are exactly the context you need to judge whether a value is
                 wrong. -->
            <div v-else class="px-4 py-3 flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-ink tabular-nums">{{ r.elapsedLabel }}</p>
                  <p class="text-[11px] text-ink-muted tabular-nums">{{ r.clock }}</p>
                </div>
                <span v-if="busyId === r.id" class="w-4 h-4 border-2 border-parchment-3 border-t-flame rounded-full animate-spin shrink-0"/>
              </div>

              <!-- text-2xl ON PURPOSE, same reasoning as ManualReadingModal:
                   typed standing at a hot kiln, often gloved, sometimes in bad
                   light. The pointer:coarse rule in tailwind.css only lifts
                   SMALL controls to 16px, so this keeps its size. -->
              <div class="flex items-center gap-3">
                <input
                  ref="editInput"
                  v-model.number="editValue"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  :max="maxInputTemp"
                  class="flex-1 min-w-0 border border-parchment-3 rounded-xl px-4 py-3 text-2xl font-bold tabular-nums text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
                  @keydown.enter="commit(r)"
                  @keydown.esc="cancelEdit"
                >
                <span class="text-lg font-bold text-ink-faint shrink-0">{{ unitLabel }}</span>
              </div>

              <div class="flex flex-wrap gap-2">
                <!-- Two-tap delete, same pattern as FiringSidebarMobile: no
                     confirm dialog to dismiss with wet or gloved hands. -->
                <button
                  v-if="confirmDeleteId !== r.id"
                  class="px-3 py-2.5 min-h-[44px] border border-red-200 text-red-500 text-sm font-semibold rounded-lg active:bg-red-50 transition-colors disabled:opacity-60"
                  :disabled="busyId === r.id"
                  @click="confirmDeleteId = r.id"
                >Delete</button>
                <button
                  v-else
                  class="px-3 py-2.5 min-h-[44px] bg-red-500 text-white text-sm font-bold rounded-lg disabled:opacity-60"
                  :disabled="busyId === r.id"
                  @click="$emit('delete', r.id)"
                >Delete?</button>

                <div class="flex gap-2 ml-auto">
                  <button
                    class="px-3 py-2.5 min-h-[44px] border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg active:bg-parchment-2 transition-colors"
                    @click="cancelEdit"
                  >Cancel</button>
                  <button
                    class="px-4 py-2.5 min-h-[44px] bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canCommit(r) || busyId === r.id"
                    @click="commit(r)"
                  >Save</button>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <div class="shrink-0 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-parchment-3">
          <p class="text-[11px] text-ink-faint leading-snug text-center">
            Tap a reading to change its temperature. Times can't be edited — delete and re-log instead.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/ReadingsTableModal.vue
const props = defineProps({
  open:      Boolean,
  readings:  { type: Array, default: () => [] },   // [{ id, temperature (°C), timestamp }]
  startedAt: { type: Number, default: 0 },
  busyId:    { type: [Number, String], default: null },
})

const emit = defineEmits(['close', 'update', 'delete'])

const { displayTemp, toCelsius, unitLabel, maxInputTemp } = useTempUnit()

// Above this, a jump between neighbours is far more likely a typo than a kiln.
// ADVISORY ONLY. Plainsman's production bisque climbs at 170C/hr and Bartlett
// Fast Bisque at 166, so the threshold sits well clear of real firing rates
// while still catching a misplaced digit.
const OUTLIER_C_HR = 400

const newestFirst     = ref(true)
const editingId       = ref(null)
const editValue       = ref(null)
const confirmDeleteId = ref(null)
const editInput       = ref(null)

// Reset transient state whenever the sheet opens, so it never reappears with a
// half-finished edit or an armed delete left over from last time.
watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  editingId.value = null
  editValue.value = null
  confirmDeleteId.value = null
})

// The parent refetches after every save/delete, so a new readings array with
// nothing in flight means the round trip finished: close the edit row. The
// sheet itself stays OPEN, because fixing readings is usually a run of edits
// rather than one.
watch(() => props.readings, () => {
  if (props.busyId === null) {
    editingId.value = null
    confirmDeleteId.value = null
  }
})

function fmtElapsed(secs) {
  const mins = Math.max(Math.round(secs / 60), 0)
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Rate is computed against the CHRONOLOGICAL neighbour, independently of the
// display sort order -- flipping to newest-first must not invert the sign.
const rows = computed(() => {
  const chrono = [...(props.readings ?? [])].sort((a, b) => a.timestamp - b.timestamp)

  const built = chrono.map((r, i) => {
    const prev = i > 0 ? chrono[i - 1] : null
    let rateC = null
    if (prev) {
      const mins = (r.timestamp - prev.timestamp) / 60
      // Sub-30-second gaps produce meaningless rates (two taps in a row), so
      // they get no rate rather than a spurious outlier flag.
      if (mins > 0.5) rateC = ((r.temperature - prev.temperature) / mins) * 60
    }
    return {
      id: r.id,
      tempC: r.temperature,
      timestamp: r.timestamp,
      display: displayTemp(r.temperature),
      elapsedLabel: fmtElapsed(r.timestamp - props.startedAt),
      clock: new Date(r.timestamp * 1000).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
      rateLabel: rateC === null ? '' : `${rateC >= 0 ? '+' : ''}${Math.round(rateC)}°C/hr`,
      outlier: rateC !== null && Math.abs(rateC) > OUTLIER_C_HR,
    }
  })

  return newestFirst.value ? built.reverse() : built
})

const outlierCount = computed(() => rows.value.filter(r => r.outlier).length)

function startEdit(r) {
  editingId.value = r.id
  editValue.value = r.display
  confirmDeleteId.value = null
  nextTick(() => {
    // v-for refs collect into an array; only one row is ever in edit state.
    const el = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
    el?.focus()
    el?.select()
  })
}

function cancelEdit() {
  editingId.value = null
  editValue.value = null
  confirmDeleteId.value = null
}

// Compares in °C so a no-op edit can't fire a pointless request, and so the
// check behaves identically in °F where rounding differs.
function canCommit(r) {
  if (editValue.value === null || editValue.value === '' || Number.isNaN(editValue.value)) return false
  if (editValue.value <= 0) return false
  return Math.round(toCelsius(editValue.value)) !== Math.round(r.tempC)
}

function commit(r) {
  if (!canCommit(r)) return
  emit('update', { id: r.id, temperature: toCelsius(editValue.value) })
}
</script>