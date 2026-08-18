// File: app/composables/useFiringStats.js
//
// All math in °C; display values convert via useTempUnit. Returns both the
// formatted strings and the raw °C numbers, so callers never parse strings back.
// nextCone and atmosphere need the /api/cones list passed in (it carries temp_c).
//
// CONE PACK (Aug 2026): when the firing carries a cone_pack, nextCone is the
// next UNDROPPED PACK cone above the current temp - an ETA to a cone that is
// physically in the kiln. No pack -> fall back to the full Orton table.

import { computed, unref } from 'vue'

const EMA_ALPHA = 0.3
const MIN_RATE_FOR_ETA = 0.1   // °C/min; below this the kiln is stalled or cooling
const MAX_ETA_MINUTES  = 999

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

export function useFiringStats(selectedFiring, nowUnix, cones = []) {
  const { displayTemp, convertRate, rateUnitLabel } = useTempUnit()

  function fmtRate(cRate) {
    const r = Math.round(convertRate(cRate))
    return `${r >= 0 ? '+' : ''}${r}${rateUnitLabel.value}`
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

  const currentTempC = computed(() => {
    const rs = selectedFiring.value?.readings
    if (!rs?.length) return null
    return [...rs].sort((a, b) => a.timestamp - b.timestamp).at(-1).temperature
  })

  // UNROUNDED EMA (°C/min). The ETA divides by this, so whole-degree rounding
  // made it jump in big steps (1.65 -> 2 turned an 8 min ETA into 5). Display
  // rounding happens in fmtRate only.
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
    return ema
  })

  const rateOfChange = computed(() => (rateC.value === null ? '—' : fmtRate(rateC.value)))

  const targetRateC = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.schedule?.length || f.schedule.length < 2) return null
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - (f.schedule_offset ?? 0)
    const schedule = [...f.schedule].sort((a, b) => a.offset_minutes - b.offset_minutes)
    if (elapsedMins >= schedule.at(-1).offset_minutes) return 0

    let before = schedule[0], after = schedule[1]
    for (let i = 0; i < schedule.length - 1; i++) {
      if (schedule[i].offset_minutes <= elapsedMins && schedule[i + 1].offset_minutes >= elapsedMins) {
        before = schedule[i]; after = schedule[i + 1]
        break
      }
    }
    const deltaMins = after.offset_minutes - before.offset_minutes
    if (deltaMins === 0) return 0
    return (after.target_temp - before.target_temp) / deltaMins
  })

  const targetRate = computed(() => (targetRateC.value === null ? '—' : fmtRate(targetRateC.value)))

  const targetTempC = computed(() => {
    const f = selectedFiring.value
    if (!f?.started_at || !f?.schedule?.length) return null
    const elapsedMins = (nowUnix.value - f.started_at) / 60 - (f.schedule_offset ?? 0)
    const temp = interpolateSchedule(f.schedule, elapsedMins)
    return temp !== null ? Math.round(temp) : null
  })

  const targetTemp = computed(() => (targetTempC.value === null ? null : displayTemp(targetTempC.value)))

  const rankedCones = computed(() =>
    (unref(cones) ?? [])
      .filter(c => Number.isFinite(Number(c.temp_c)))
      .map(c => ({ name: c.name, tempC: Number(c.temp_c) }))
      .sort((a, b) => a.tempC - b.tempC)
  )

  // The firing's planned pack, resolved to ratings. Empty array = no pack.
  const packCones = computed(() => {
    const pack = selectedFiring.value?.cone_pack
    if (!Array.isArray(pack) || !pack.length) return []
    const names = new Set(pack)
    return rankedCones.value.filter(c => names.has(c.name))
  })

  const droppedNames = computed(() =>
    new Set((selectedFiring.value?.cone_drops ?? []).map(d => d.cone))
  )

  // The cone the kiln is heading for. With a pack: the lowest undropped pack
  // cone above the current temp - an ETA to a cone physically in the kiln.
  // Without: the next Orton cone (best available guess). The ETA is against
  // the ~60C/hr rating and is an estimate; the witness cone is the authority.
  const nextCone = computed(() => {
    const temp = currentTempC.value
    if (temp === null || !rankedCones.value.length) return null

    const candidates = packCones.value.length
      ? packCones.value.filter(c => !droppedNames.value.has(c.name))
      : rankedCones.value

    const cone = candidates.find(c => c.tempC > temp)
    if (!cone) return null

    const etaMinutes = (rateC.value !== null && rateC.value > MIN_RATE_FOR_ETA)
      ? Math.min(Math.round((cone.tempC - temp) / rateC.value), MAX_ETA_MINUTES)
      : null

    return { name: cone.name, tempC: cone.tempC, etaMinutes }
  })

  function coneNameAtTemp(tempC) {
    return rankedCones.value.find(c => Math.abs(c.tempC - tempC) <= 3)?.name ?? null
  }

  // Which planned band the firing is inside, and the next transition. Neutral
  // has no row, so state === null means neutral rather than unknown.
  const atmosphere = computed(() => {
    const planned = (selectedFiring.value?.reductions ?? []).filter(r => r.origin === 'planned')
    if (!planned.length) return null
    const temp = currentTempC.value

    const bands = planned
      .map(r => ({
        kind:  r.kind === 'oxidation' ? 'oxidation' : 'reduction',
        start: r.start_temp,
        end:   r.end_temp ?? Infinity,
      }))
      .sort((a, b) => a.start - b.start)

    const state = temp === null
      ? null
      : (bands.find(b => temp >= b.start && temp < b.end)?.kind ?? null)
    const upcoming = temp === null ? bands[0] : bands.find(b => b.start > temp)

    return {
      state,
      next: upcoming
        ? { kind: upcoming.kind, tempC: upcoming.start, cone: coneNameAtTemp(upcoming.start) }
        : null,
    }
  })

  return {
    duration, readingCount, elapsed,
    rateOfChange, targetRate, targetTemp,
    rateC, targetRateC, targetTempC, currentTempC,
    nextCone, atmosphere,
  }
}