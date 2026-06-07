// app/composables/useFiringStats.js

import { computed } from 'vue'

const EMA_ALPHA = 0.3

function fmtDur(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtRate(rate) {
  return rate >= 0 ? `+${rate}°/m` : `${rate}°/m`
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
    if (!f?.started_at || !f?.schedule?.length) {
      console.warn('[targetRate] no firing or no schedule', {
        hasFiring: !!f,
        hasStartedAt: !!f?.started_at,
        scheduleLength: f?.schedule?.length ?? 0,
      })
      return '—'
    }
    if (f.schedule.length < 2) {
      console.warn('[targetRate] schedule has fewer than 2 points — cannot compute rate', f.schedule)
      return '—'
    }
    const offset = f.schedule_offset ?? 0
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - offset
    const schedule = [...f.schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)

    console.log('[targetRate]', {
      elapsedMins: Math.round(elapsedMins),
      offset,
      scheduleLength: schedule.length,
      firstPoint: schedule[0],
      lastPoint: schedule.at(-1),
    })

    // Past the end — plan is flat
    if (elapsedMins >= schedule.at(-1).offset_minutes) {
      console.log('[targetRate] past schedule end → +0°/m')
      return fmtRate(0)
    }

    // Default to opening segment; override if elapsed falls inside a segment
    let before = schedule[0], after = schedule[1]
    for (let i = 0; i < schedule.length - 1; i++) {
      if (schedule[i].offset_minutes <= elapsedMins && schedule[i + 1].offset_minutes >= elapsedMins) {
        before = schedule[i]; after = schedule[i + 1]
        break
      }
    }

    const deltaTemp = after.target_temp - before.target_temp
    const deltaMins = after.offset_minutes - before.offset_minutes
    console.log('[targetRate] segment', { before, after, deltaTemp, deltaMins })

    if (deltaMins === 0) {
      console.warn('[targetRate] zero-width segment (duplicate offsets?)', { before, after })
      return fmtRate(0)
    }
    return fmtRate(Math.round(deltaTemp / deltaMins))
  })

  const targetTemp = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.schedule?.length) return null
    const offset = f.schedule_offset ?? 0
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - offset
    const temp = interpolateSchedule(f.schedule, elapsedMins)
    return temp !== null ? Math.round(temp) : null
  })

  return { peakTemp, duration, readingCount, elapsed, rateOfChange, targetRate, targetTemp }
}