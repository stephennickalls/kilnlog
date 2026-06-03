// app/composables/useFiringStats.js
//
// Pure, side-effect-free derivations for a firing.
// Takes refs for the selected firing and the current unix time;
// returns computed stats. No intervals, no fetches — safe to test in isolation.
//
// Usage:
//   const { peakTemp, duration, readingCount, elapsed, rateOfChange, targetRate }
//     = useFiringStats(selectedFiring, nowUnix)

import { computed } from 'vue'

const EMA_ALPHA = 0.3

function fmtDur(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtRate(rate) {
  return rate >= 0 ? `+${rate}°/m` : `${rate}°/m`
}

export function useFiringStats(selectedFiring, nowUnix) {
  const peakTemp = computed(() => {
    const readings = selectedFiring.value?.readings
    if (!readings?.length) return null
    return Math.max(...readings.map(r => r.temperature))
  })

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

  const rateOfChange = computed(() => {
    const readings = selectedFiring.value?.readings
    if (!readings || readings.length < 2) return '—'
    let ema = null
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1], curr = readings[i]
      const deltaMins = (curr.timestamp - prev.timestamp) / 60
      if (deltaMins < 0.5) continue
      const instantRate = (curr.temperature - prev.temperature) / deltaMins
      ema = ema === null ? instantRate : EMA_ALPHA * instantRate + (1 - EMA_ALPHA) * ema
    }
    if (ema === null) return '—'
    return fmtRate(Math.round(ema))
  })

  const targetRate = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.schedule?.length) return '—'
    // schedule_offset shifts the planned curve right; equivalently we compare
    // against elapsed time minus the offset so waypoints line up with the shift.
    const offset = f.schedule_offset ?? 0
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - offset
    const schedule = [...f.schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)
    let before = null, after = null
    for (let i = 0; i < schedule.length - 1; i++) {
      if (schedule[i].offset_minutes <= elapsedMins && schedule[i + 1].offset_minutes >= elapsedMins) {
        before = schedule[i]; after = schedule[i + 1]; break
      }
    }
    if (!before || !after) return '—'
    const deltaTemp = after.target_temp - before.target_temp
    const deltaMins = after.offset_minutes - before.offset_minutes
    if (deltaMins === 0) return '—'
    return fmtRate(Math.round(deltaTemp / deltaMins))
  })

  return { peakTemp, duration, readingCount, elapsed, rateOfChange, targetRate }
}