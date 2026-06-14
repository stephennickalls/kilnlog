// File: app/composables/useTempUnit.js
//
// G1 — the ONE place temperature conversion happens. Everything else stays in
// °C (storage, API, props, chart data, interpolation). Components call these
// helpers at the display/input edge only.
//
// Conventions (all sandbox-verified):
//   - displayTemp(c):  absolute °C -> number in the user's unit (rounded).
//   - toCelsius(n):    a number the user TYPED in their unit -> °C for storage.
//   - displayDelta(c): a DIFFERENCE in °C -> difference in the unit. A delta
//                      converts with ×9/5 and NO +32 offset (the classic bug).
//   - convertRate(c):  a rate in °C/min -> unit/min. Same as a delta (no offset).
//   - unitLabel:       '°C' | '°F'   ·   rateUnitLabel: '°C/m' | '°F/m'
//   - maxInputTemp:    the input cap in the current unit (1400°C === 2552°F).
//
// State is a Nuxt useState singleton so every component shares one unit value;
// app.vue hydrates it once from the server and the toggle writes it.

const TEMP_UNIT_KEY = 'temp-unit'
const MAX_C = 1400              // server validation cap, in °C — never changes

export function useTempUnit() {
  // 'C' (default) | 'F'. Shared across the app.
  const unit = useState(TEMP_UNIT_KEY, () => 'C')

  const isF = computed(() => unit.value === 'F')
  const unitLabel = computed(() => (isF.value ? '°F' : '°C'))
  const rateUnitLabel = computed(() => (isF.value ? '°F/m' : '°C/m'))

  // Absolute temperature for display. null passes through (callers render '—').
  function displayTemp(c) {
    if (c === null || c === undefined || !Number.isFinite(Number(c))) return null
    const n = Number(c)
    return Math.round(isF.value ? n * 9 / 5 + 32 : n)
  }

  // A typed value in the current unit back to °C for storage. Not rounded —
  // storage keeps precision; the server clamps/validates.
  function toCelsius(n) {
    if (n === null || n === undefined || !Number.isFinite(Number(n))) return null
    const v = Number(n)
    return isF.value ? (v - 32) * 5 / 9 : v
  }

  // A DELTA (difference) in °C -> the unit. No offset.
  function displayDelta(cDelta) {
    if (cDelta === null || cDelta === undefined || !Number.isFinite(Number(cDelta))) return null
    const d = Number(cDelta)
    return Math.round(isF.value ? d * 9 / 5 : d)
  }

  // A rate in °C/min -> unit/min. No offset (a rate is a delta per minute).
  function convertRate(cRate) {
    if (cRate === null || cRate === undefined || !Number.isFinite(Number(cRate))) return null
    const r = Number(cRate)
    return isF.value ? r * 9 / 5 : r
  }

  // Input cap shown in the field, in the current unit.
  const maxInputTemp = computed(() => (isF.value ? Math.round(MAX_C * 9 / 5 + 32) : MAX_C))

  // Local-only setter (used by the optimistic toggle before/independent of the
  // network save). Persistence lives in the /api/preferences route + app.vue.
  function setUnit(u) {
    if (u === 'C' || u === 'F') unit.value = u
  }

  return {
    unit,
    isF,
    unitLabel,
    rateUnitLabel,
    maxInputTemp,
    displayTemp,
    toCelsius,
    displayDelta,
    convertRate,
    setUnit,
  }
}