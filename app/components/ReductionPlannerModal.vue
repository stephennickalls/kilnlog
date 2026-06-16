<!-- app/components/ReductionPlannerModal.vue -->
<!--
  G11 fast-follow — plan reduction periods on a schedule. Opened from a visible
  "Reduction" button by the curve. Lists existing planned reductions with
  add / edit / remove. Each is a start temp (required) and an optional end temp.

  KEY CONCEPT for the user: a planned reduction is an INTENTION, not a record.
  During a real firing, reduction is judged by flame and atmosphere, so the
  actual start/end may differ. The end field is explicitly "suggested". On the
  curve these render as dashed "planned" bands, distinct from the solid bands
  you log live.

  Cooling reductions are allowed: end may be ABOVE or BELOW start (just not
  equal). All temps are °C in the model; the UI shows/accepts the user's unit
  via useTempUnit.

  Emits `save(reductions)` with an array of { startTemp, endTemp|null } in °C.
  The parent holds these in local state and persists them with the schedule.
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[75] flex items-end sm:items-center justify-center font-serif"
      style="background:rgba(26,18,8,0.6)"
      @click.self="$emit('close')"
    >
      <div class="bg-parchment w-full sm:w-[460px] sm:rounded-2xl rounded-t-2xl sm:max-h-[88vh] max-h-[92vh] overflow-y-auto flex flex-col border border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-parchment-3 shrink-0">
          <div>
            <h2 class="text-base font-bold text-ink">Plan reduction</h2>
            <p class="text-xs text-ink-muted mt-0.5">Mark when you intend to reduce. This is a plan — your real firing decides the rest.</p>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-parchment-2 text-ink-muted hover:text-ink transition-colors shrink-0" @click="$emit('close')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex flex-col gap-3 px-6 py-5">

          <!-- Existing reductions -->
          <div v-if="rows.length" class="flex flex-col gap-2">
            <div
              v-for="(r, i) in rows" :key="i"
              class="flex flex-col gap-2 p-3 rounded-xl border border-indigo-200 bg-indigo-50/50"
            >
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-indigo-700">Reduction {{ i + 1 }}</span>
                <button class="text-indigo-400 hover:text-red-500 transition-colors" title="Remove" @click="removeRow(i)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-semibold text-ink-faint">Start {{ unitLabel }} <span class="text-red-400">*</span></label>
                  <input
                    :value="r.startDisplay"
                    type="number" min="0" :max="maxInputTemp" placeholder="950"
                    class="w-full border border-parchment-3 rounded-lg px-2.5 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif"
                    @input="onStartInput(i, $event.target.value)"
                    @blur="snapDisplay(i, 'start')"
                  >
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-semibold text-ink-faint">End {{ unitLabel }} <span class="font-normal text-parchment-4">(optional)</span></label>
                  <input
                    :value="r.endDisplay"
                    type="number" min="0" :max="maxInputTemp" placeholder="—"
                    class="w-full border border-parchment-3 rounded-lg px-2.5 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif"
                    @input="onEndInput(i, $event.target.value)"
                    @blur="snapDisplay(i, 'end')"
                  >
                </div>
              </div>
              <p v-if="r.error" class="text-[11px] text-red-500">{{ r.error }}</p>
            </div>
          </div>

          <p v-else class="text-sm text-ink-muted text-center py-4">
            No reductions planned yet. Add one to mark where you intend to reduce the atmosphere.
          </p>

          <!-- Add -->
          <button
            class="flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-sm font-semibold rounded-xl transition-colors"
            @click="addRow"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Add reduction
          </button>

          <!-- The "suggested end" explainer -->
          <p class="text-[11px] text-ink-muted leading-relaxed bg-parchment-2 border border-parchment-3 rounded-lg px-3 py-2">
            The <strong>end</strong> is a suggestion. Reduction is judged by flame and atmosphere during the firing, so your actual reduction may start and end at different temperatures than planned. Leave it blank for an open-ended reduction.
          </p>

        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-6 pb-6 pt-4 border-t border-parchment-3 shrink-0">
          <button class="px-4 py-2 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-lg transition-colors" @click="$emit('close')">Cancel</button>
          <button
            class="px-4 py-2 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canSave"
            @click="save"
          >Save reductions</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open:       Boolean,
  // Planned reductions in °C: [{ startTemp, endTemp|null }]
  reductions: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'save'])

const { displayTemp, toCelsius, unitLabel, maxInputTemp } = useTempUnit()
const MAX_C = 1400
const MIN_C = 0

// Local editable rows. We keep the user's typed display values as strings while
// editing, plus the resolved °C, so conversion happens once per edit.
const rows = ref([])

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  rows.value = (props.reductions ?? []).map(r => ({
    startC:       r.startTemp ?? r.start_temp ?? null,
    endC:         (r.endTemp ?? r.end_temp ?? null),
    startDisplay: (r.startTemp ?? r.start_temp) != null ? String(displayTemp(r.startTemp ?? r.start_temp)) : '',
    endDisplay:   (r.endTemp ?? r.end_temp) != null ? String(displayTemp(r.endTemp ?? r.end_temp)) : '',
    error:        '',
  }))
})

// Bug fix: when the user toggles °C/°F while this modal is open, the stored °C
// values are the truth but the displayed strings are stale. Re-derive the
// display strings from °C on every unit change so the numbers track the toggle
// and stay in the same real-world place.
watch(unitLabel, () => {
  for (const row of rows.value) {
    row.startDisplay = row.startC != null && Number.isFinite(row.startC) ? String(displayTemp(row.startC)) : ''
    row.endDisplay   = row.endC   != null && Number.isFinite(row.endC)   ? String(displayTemp(row.endC))   : ''
  }
})

function addRow() {
  rows.value.push({ startC: null, endC: null, startDisplay: '', endDisplay: '', error: '' })
}
function removeRow(i) { rows.value.splice(i, 1) }

// Convert a typed display value to °C and clamp to the valid kiln range, so a
// value above the cap (e.g. 1500°C / 2732°F) can't be stored. Returns null for
// empty input.
function clampedC(val) {
  if (val === '' || val === null || val === undefined) return null
  const c = toCelsius(Number(val))
  if (!Number.isFinite(c)) return null
  return Math.min(Math.max(c, MIN_C), MAX_C)
}

function onStartInput(i, val) {
  const row = rows.value[i]
  row.startDisplay = val
  row.startC = clampedC(val)
  validateRow(row)
}
function onEndInput(i, val) {
  const row = rows.value[i]
  row.endDisplay = val
  row.endC = clampedC(val)
  validateRow(row)
}

// On blur, snap the field text to the clamped, stored value so a typed
// out-of-range number (e.g. 1500°C) visibly corrects to the cap (1400°C).
function snapDisplay(i, which) {
  const row = rows.value[i]
  if (which === 'start') {
    row.startDisplay = row.startC != null && Number.isFinite(row.startC) ? String(displayTemp(row.startC)) : ''
  } else {
    row.endDisplay = row.endC != null && Number.isFinite(row.endC) ? String(displayTemp(row.endC)) : ''
  }
}

function validateRow(row) {
  row.error = ''
  if (row.startC === null || !Number.isFinite(row.startC)) {
    row.error = 'Start temperature is required.'
    return false
  }
  if (row.endC !== null && Number.isFinite(row.endC)) {
    // Cooling allowed (end below start); only equal is invalid.
    if (Math.round(row.endC) === Math.round(row.startC)) {
      row.error = 'End must differ from start.'
      return false
    }
  }
  return true
}

const canSave = computed(() =>
  rows.value.length === 0 || rows.value.every(r =>
    r.startC !== null && Number.isFinite(r.startC) && !r.error
  )
)

function save() {
  // Final validation pass.
  let ok = true
  for (const r of rows.value) if (!validateRow(r)) ok = false
  if (!ok) return
  const out = rows.value.map(r => ({
    startTemp: Math.round(r.startC),
    endTemp:   (r.endC !== null && Number.isFinite(r.endC)) ? Math.round(r.endC) : null,
  }))
  emit('save', out)
}
</script>