// File: app/composables/useFiringStats.js
//
// G1 — now unit-aware. All MATH stays in °C (interpolation, EMA rate); only
// the final display values convert via useTempUnit. To keep FiringConsole's
// colour logic robust (it compares actual vs target), this returns BOTH:
//   - formatted display strings/numbers (targetTemp, rateOfChange, targetRate)
//   - raw °C numbers (targetTempC, rateC, targetRateC) for comparisons
// FiringConsole no longer parses strings back into numbers.

import { computed } from 'vue'

const EMA_ALPHA = 0.3

function fmtDur(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function interpolateSchedule(schedule, elapsedMins) {
  if (!schedule?.length) return null
  const sorted = [...schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)
  if (elapsedMins <= sorted[0].offset_minutes) return sorted[0].target_temp
  if (elapsedMins >= sorted.at(-1).offset_minutes) return sorted.at(-1).target_temp
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1]
    if (elapsedMins >= a.offset_minutes && elapsedMins <= b.offset_minutes) {
      const frac = (elapsedMins - a.offset_minutes) / (b.offset_minutes - a.offset_minutes)
      return a.target_temp + frac * (b.target_temp - a.target_temp)
    }
  }
  return null
}

export function useFiringStats(selectedFiring, nowUnix) {
  // Display conversion helpers — shared singleton, reacts to the unit toggle.
  const { displayTemp, convertRate, rateUnitLabel } = useTempUnit()

  // Format a °C/min rate into the display string in the active unit.
  function fmtRate(cRate) {
    const r = Math.round(convertRate(cRate))
    const sign = r >= 0 ? '+' : ''
    return `${sign}${r}${rateUnitLabel.value}`
  }

  const duration = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.ended_at) return null
    return fmtDur(Math.round((f.ended_at - f.started_at) / 60))
  })

  const readingCount = computed(() => selectedFiring.value?.readings?.length ?? 0)

  const elapsed = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at) return '—'
    return fmtDur(Math.round((nowUnix.value - f.started_at) / 60))
  })

  // Raw EMA rate in °C/min (or null). Math unchanged from the original.
  const rateC = computed(() => {
    const readings = selectedFiring.value?.readings
    if (!readings || readings.length < 2) return null
    let ema = null
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1], curr = readings[i]
      const deltaMins = (curr.timestamp - prev.timestamp) / 60
      if (deltaMins < 0.5) continue
      const instantRate = (curr.temperature - prev.temperature) / deltaMins
      ema = ema === null ? instantRate : EMA_ALPHA * instantRate + (1 - EMA_ALPHA) * ema
    }
    return ema === null ? null : Math.round(ema)
  })

  const rateOfChange = computed(() => (rateC.value === null ? '—' : fmtRate(rateC.value)))

  // Raw target rate in °C/min (or null).
  const targetRateC = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.schedule?.length || f.schedule.length < 2) return null
    const offset = f.schedule_offset ?? 0
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - offset
    const schedule = [...f.schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)

    if (elapsedMins >= schedule.at(-1).offset_minutes) return 0

    let before = schedule[0], after = schedule[1]
    for (let i = 0; i < schedule.length - 1; i++) {
      if (schedule[i].offset_minutes <= elapsedMins && schedule[i + 1].offset_minutes >= elapsedMins) {
        before = schedule[i]; after = schedule[i + 1]
        break
      }
    }
    const deltaTemp = after.target_temp - before.target_temp
    const deltaMins = after.offset_minutes - before.offset_minutes
    if (deltaMins === 0) return 0
    return Math.round(deltaTemp / deltaMins)
  })

  const targetRate = computed(() => (targetRateC.value === null ? '—' : fmtRate(targetRateC.value)))

  // Raw target temp in °C (or null).
  const targetTempC = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.schedule?.length) return null
    const offset = f.schedule_offset ?? 0
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - offset
    const temp = interpolateSchedule(f.schedule, elapsedMins)
    return temp !== null ? Math.round(temp) : null
  })

  // Display target temp (number in the active unit, or null).
  const targetTemp = computed(() => (targetTempC.value === null ? null : displayTemp(targetTempC.value)))

  return {
    duration,
    readingCount,
    elapsed,
    rateOfChange,
    targetRate,
    targetTemp,
    // raw °C values for comparison/colour logic
    rateC,
    targetRateC,
    targetTempC,
  }
}