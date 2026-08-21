// File: app/composables/useKilnChart.js
//
// Layers, bottom to top: cone ruler, atmosphere bands, datasets, now-line,
// cone drops. All DATA is °C; only labels convert (useTempUnit).

import { nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

let zoomReady = false
let zoomRegisterPromise = null

function ensureZoomPlugin() {
  if (zoomReady) return Promise.resolve()
  if (!import.meta.client) return Promise.resolve()
  if (zoomRegisterPromise) return zoomRegisterPromise
  zoomRegisterPromise = import('chartjs-plugin-zoom')
    .then(({ default: zoomPlugin }) => { Chart.register(zoomPlugin); zoomReady = true })
    .catch(err => console.error('[useKilnChart] FAILED to register zoom plugin:', err))
  return zoomRegisterPromise
}

// Right-hand room for cone labels ("06 · 999°"); collapses when there are none.
const CONE_GUTTER = 62
const NO_CONE_GUTTER = 8

// Fallback ruler density when the firing has no cone pack.
const MAX_CONE_LINES = 6
const MIN_CONE_GAP_C = 25

// PLANNED vs ACTUAL atmosphere (Aug 2026). Both states already existed but
// differed only by fill opacity, so "I intended to reduce here" and "I actually
// reduced here" looked the same at a glance. Planned bands now carry a diagonal
// hatch and a dashed edge, matching the dashed-plan / solid-actual grammar the
// rest of the chart already uses for the two curves.
//
// The tile is built per canvas context and cached: createPattern on every frame
// of a live firing is a new canvas every second.
const hatchCache = new WeakMap()

function plannedHatch(ctx, colour) {
  let byColour = hatchCache.get(ctx)
  if (!byColour) {
    byColour = new Map()
    hatchCache.set(ctx, byColour)
  }
  if (byColour.has(colour)) return byColour.get(colour)

  const tile = document.createElement('canvas')
  tile.width = 6
  tile.height = 6
  const t = tile.getContext('2d')
  t.strokeStyle = colour
  t.lineWidth = 1
  // Three strokes so the diagonal is seamless across tile edges.
  t.beginPath()
  t.moveTo(0, 6); t.lineTo(6, 0)
  t.moveTo(-1, 1); t.lineTo(1, -1)
  t.moveTo(5, 7); t.lineTo(7, 5)
  t.stroke()

  const pattern = ctx.createPattern(tile, 'repeat')
  byColour.set(colour, pattern)
  return pattern
}

// Minimum width before a zero-width preset band (end_temp = start_temp, the
// current workaround for reduction_one_open_per_firing) becomes invisible.
const MIN_BAND_PX = 1.5

export function useKilnChart(canvasRef, { onPointClick, enableZoom = true, showLabels = false } = {}) {
  const { unitLabel, isF } = useTempUnit()
  const cToDisplay = (c) => (isF.value ? c * 9 / 5 + 32 : c)

  let chart = null
  let xMax  = 120

  let lastSchedule   = { points: [], offset: 0 }
  let lastReadings   = { rows: [], startedAt: 0 }
  let lastReductions = []
  let lastReductionsStartedAt = 0
  let lastConeDrops  = []        // [{ cone, minutes, tempC|null }]
  let lastCones      = []        // [{ name, temp_c }]
  let targetConeName = null
  let packNames      = []        // firing's planned cone pack; [] = no pack

  let coneLines      = []        // [{ name, tempC, target }]
  let reductionBands = []        // [{ startX, endX, open, planned, kind }]
  let nowLine        = null      // null | { minutes, targetTemp (°C) }

  const curveLabelsPlugin = {
    id: 'curveLabels',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx

      const scheduleData = chart.data.datasets[0]?.data ?? []
      if (scheduleData.length) {
        ctx.save()
        ctx.font = 'bold 10px sans-serif'
        ctx.fillStyle = '#78716c'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        scheduleData.forEach((pt, i) => {
          const el = chart.getDatasetMeta(0).data[i]
          if (!el) return
          const { x, y } = el.getProps(['x', 'y'], true)
          ctx.fillText(`${Math.round(cToDisplay(pt.y))}°`, x, y + (i % 2 === 0 ? -14 : 14))
        })
        ctx.restore()
      }

      const actualData = chart.data.datasets[1]?.data ?? []
      if (actualData.length) {
        const lastIdx = actualData.length - 1
        const el = chart.getDatasetMeta(1).data[lastIdx]
        if (el) {
          const { x, y } = el.getProps(['x', 'y'], true)
          ctx.save()
          ctx.font      = 'bold 11px sans-serif'
          ctx.fillStyle = '#f97316'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText(`${Math.round(cToDisplay(actualData[lastIdx].y))}°`, x + 5, y - 6)
          ctx.restore()
        }
      }
    },
  }

  // ── Cone ruler ─────────────────────────────────────────────────────────────
  // The ruler IS the pack when the firing has one: the potter already chose
  // which cones are in the kiln, so no filtering heuristic applies. Without a
  // pack, fall back to peak-anchored selection — walk down from the plan's peak
  // keeping lines far enough apart to read. (Anchoring on the plan's FLOOR
  // would admit the whole Orton table, since every plan starts near room temp.)
  function computeConeLines() {
    const temps = [
      ...(chart?.data?.datasets?.[0]?.data ?? []),
      ...(chart?.data?.datasets?.[1]?.data ?? []),
    ].map(p => p.y).filter(v => v != null && isFinite(v))

    if (!lastCones.length || !temps.length) {
      coneLines = []
    } else {
      const peak = Math.max(...temps)
      let kept
      let target = null

      if (packNames.length) {
        const inPack = new Set(packNames)
        kept = lastCones.filter(c => inPack.has(c.name)).sort((a, b) => a.temp_c - b.temp_c)
        target = (targetConeName && kept.find(c => c.name === targetConeName))
          || [...kept].reverse().find(c => c.temp_c <= peak)
          || kept[kept.length - 1] || null
      } else {
        const candidates = lastCones
          .filter(c => c.temp_c <= peak + 30)
          .sort((a, b) => b.temp_c - a.temp_c)

        target = (targetConeName && candidates.find(c => c.name === targetConeName))
          || candidates.find(c => c.temp_c <= peak) || candidates[0] || null

        kept = target ? [target] : []
        for (const c of candidates) {
          if (kept.length >= MAX_CONE_LINES) break
          if (target && c.name === target.name) continue
          if (kept.some(k => Math.abs(k.temp_c - c.temp_c) < MIN_CONE_GAP_C)) continue
          kept.push(c)
        }
      }

      coneLines = kept.map(c => ({
        name: c.name,
        tempC: c.temp_c,
        target: !!target && c.name === target.name,
      }))
    }

    if (chart?.options?.layout?.padding) {
      chart.options.layout.padding.right = coneLines.length ? CONE_GUTTER : NO_CONE_GUTTER
    }
  }

  const coneLinesPlugin = {
    id: 'coneLines',
    beforeDatasetsDraw(chart) {
      if (!coneLines.length) return
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !scales?.y) return
      ctx.save()
      for (const line of coneLines) {
        const yPix = scales.y.getPixelForValue(line.tempC)
        if (yPix < chartArea.top || yPix > chartArea.bottom) continue

        ctx.strokeStyle = line.target ? 'rgba(95,138,120,0.75)' : 'rgba(168,162,158,0.45)'
        ctx.lineWidth   = line.target ? 1.5 : 1
        ctx.setLineDash(line.target ? [8, 3] : [4, 5])
        ctx.beginPath()
        ctx.moveTo(chartArea.left, yPix)
        ctx.lineTo(chartArea.right, yPix)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.font         = line.target ? 'bold 11px sans-serif' : '10px sans-serif'
        ctx.fillStyle    = line.target ? 'rgba(63,99,84,1)' : 'rgba(120,113,108,0.9)'
        ctx.textAlign    = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${line.name} · ${Math.round(cToDisplay(line.tempC))}°`, chartArea.right + 6, yPix)
      }
      ctx.restore()
    },
  }

  // ── Temp ⇄ time mapping (°C) ───────────────────────────────────────────────
  function minuteAtTemp(points, temp) {
    if (!points.length) return null
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1]
      const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y)
      if (temp >= lo && temp <= hi) {
        const span = b.y - a.y
        return a.x + (span === 0 ? 0 : (temp - a.y) / span) * (b.x - a.x)
      }
    }
    const first = points[0], last = points[points.length - 1]
    if (temp <= Math.min(first.y, last.y)) return first.x
    return null
  }

  // Crossings at or after fromX only — stops a legacy closed band snapping back
  // to an earlier crossing of the same temperature and collapsing to a sliver.
  function minuteAtTempAfter(points, temp, fromX) {
    if (!points.length) return null
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1]
      if (b.x < fromX) continue
      const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y)
      if (temp >= lo && temp <= hi) {
        const span = b.y - a.y
        const x = a.x + (span === 0 ? 0 : (temp - a.y) / span) * (b.x - a.x)
        if (x >= fromX) return x
      }
    }
    return null
  }

  function targetAtMinute(points, minute) {
    if (!points.length) return null
    if (minute <= points[0].x) return points[0].y
    const last = points[points.length - 1]
    if (minute >= last.x) return last.y
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1]
      if (minute >= a.x && minute <= b.x) {
        const span = b.x - a.x
        return a.y + (span === 0 ? 0 : (minute - a.x) / span) * (b.y - a.y)
      }
    }
    return null
  }

  // ── Atmosphere bands ───────────────────────────────────────────────────────
  // Live rows anchor by TIME (created_at / ended_at / NOW). origin='planned'
  // rows have no timeline of their own — their created_at is the firing's
  // creation moment — so they anchor by TEMP against the PLANNED curve. Keep
  // these two paths separate.
  function computeReductionBands() {
    const actual = chart?.data?.datasets?.[1]?.data ?? []
    const startedAt = lastReductionsStartedAt
    const bands = []

    for (const p of lastReductions) {
      const open = p.end_temp == null && !p.ended_at
      const kind = p.kind === 'oxidation' ? 'oxidation' : 'reduction'

      if (startedAt && p.created_at && p.origin !== 'planned') {
        const startX = (p.created_at - startedAt) / 60
        let endX
        if (p.ended_at) {
          endX = (p.ended_at - startedAt) / 60
        } else if (open) {
          endX = (Date.now() / 1000 - startedAt) / 60
        } else {
          const e = minuteAtTempAfter(actual, p.end_temp, startX)
          endX = e !== null ? e
               : (actual.length ? Math.max(actual[actual.length - 1].x, startX) : startX)
        }
        bands.push({ startX, endX: Math.max(endX, startX), open, planned: false, kind })
        continue
      }

      const isPlanned = p.origin === 'planned'
      const source = isPlanned ? (chart?.data?.datasets?.[0]?.data ?? []) : actual
      const startX = minuteAtTemp(source, p.start_temp)
      if (startX === null) continue
      let endX
      if (p.end_temp === null || p.end_temp === undefined) {
        endX = source.length ? source[source.length - 1].x : startX
      } else {
        const e = minuteAtTemp(source, p.end_temp)
        endX = e === null ? (source.length ? source[source.length - 1].x : startX) : e
      }
      bands.push({ startX, endX: Math.max(endX, startX), open, planned: isPlanned, kind })
    }
    reductionBands = bands
  }

  const BAND_STYLE = {
    reduction: {
      fill:   { planned: 'rgba(58,90,120,0.05)',  open: 'rgba(58,90,120,0.10)',  closed: 'rgba(58,90,120,0.14)' },
      stroke: { planned: 'rgba(58,90,120,0.45)',  open: 'rgba(58,90,120,0.55)',  closed: 'rgba(58,90,120,0.45)' },
      text:   { planned: 'rgba(40,64,87,0.6)',    open: 'rgba(40,64,87,0.9)',    closed: 'rgba(40,64,87,0.75)' },
      label:  { planned: 'Planned reduction',     open: 'Reduction…',            closed: 'Reduction' },
      hatch:  'rgba(58,90,120,0.28)',
    },
    oxidation: {
      fill:   { planned: 'rgba(202,138,4,0.05)',  open: 'rgba(202,138,4,0.10)',  closed: 'rgba(202,138,4,0.13)' },
      stroke: { planned: 'rgba(180,120,20,0.45)', open: 'rgba(180,120,20,0.55)', closed: 'rgba(180,120,20,0.45)' },
      text:   { planned: 'rgba(146,94,10,0.65)',  open: 'rgba(146,94,10,0.95)',  closed: 'rgba(146,94,10,0.8)' },
      label:  { planned: 'Planned oxidation',     open: 'Oxidation…',            closed: 'Oxidation' },
      hatch:  'rgba(180,120,20,0.30)',
    },
  }

  const reductionBandsPlugin = {
    id: 'reductionBands',
    beforeDatasetsDraw(chart) {
      if (!reductionBands.length) return
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !scales?.x) return

      const top    = chartArea.top
      const height = chartArea.bottom - chartArea.top

      ctx.save()
      for (const band of reductionBands) {
        const style = BAND_STYLE[band.kind] ?? BAND_STYLE.reduction
        const state = band.planned ? 'planned' : (band.open ? 'open' : 'closed')

        const xPix1 = scales.x.getPixelForValue(band.startX)
        const xPix2 = scales.x.getPixelForValue(band.endX)
        const left  = Math.max(Math.min(xPix1, xPix2), chartArea.left)
        const right = Math.min(Math.max(xPix1, xPix2), chartArea.right)
        const width = Math.max(right - left, MIN_BAND_PX)

        ctx.fillStyle = style.fill[state]
        ctx.fillRect(left, top, width, height)

        // Planned bands get the hatch on top of the flat wash. Live bands stay
        // solid: the plan is a drawing, the firing is a fact.
        if (band.planned) {
          const pattern = plannedHatch(ctx, style.hatch)
          if (pattern) {
            ctx.fillStyle = pattern
            ctx.fillRect(left, top, width, height)
          }
        }

        ctx.strokeStyle = style.stroke[state]
        ctx.lineWidth = 1
        ctx.setLineDash(band.planned ? [4, 4] : [])

        ctx.beginPath()
        ctx.moveTo(left, top)
        ctx.lineTo(left, chartArea.bottom)
        ctx.stroke()

        // Open live bands get no right edge: their edge is the advancing NOW.
        if (band.planned || !band.open) {
          ctx.beginPath()
          ctx.moveTo(right, top)
          ctx.lineTo(right, chartArea.bottom)
          ctx.stroke()
        }
        ctx.setLineDash([])

        if (width > 30) {
          ctx.font = 'bold 9px sans-serif'
          ctx.fillStyle = style.text[state]
          ctx.textBaseline = 'alphabetic'
          if (band.planned) {
            // Right-aligned: the live band that shadows this one starts a few
            // minutes later and would otherwise print on top of this label.
            ctx.textAlign = 'right'
            ctx.fillText(style.label[state], right - 4, top + 12)
          } else {
            ctx.textAlign = 'left'
            ctx.fillText(style.label[state], left + 4, top + 12)
          }
        }
      }
      ctx.restore()
    },
  }

  const nowLinePlugin = {
    id: 'nowLine',
    afterDatasetsDraw(chart) {
      if (!nowLine) return
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !scales?.x || !scales?.y) return

      const xPix = scales.x.getPixelForValue(nowLine.minutes)
      if (xPix < chartArea.left - 0.5 || xPix > chartArea.right + 0.5) return

      ctx.save()
      ctx.strokeStyle = 'rgba(95,138,120,0.9)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(xPix, chartArea.top)
      ctx.lineTo(xPix, chartArea.bottom)
      ctx.stroke()

      const tag = 'NOW'
      ctx.font = 'bold 9px sans-serif'
      const tagW = ctx.measureText(tag).width + 8
      const tagX = Math.min(xPix, chartArea.right - tagW)
      ctx.fillStyle = 'rgba(95,138,120,0.95)'
      ctx.fillRect(tagX, chartArea.top, tagW, 14)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(tag, tagX + 4, chartArea.top + 7)

      if (nowLine.targetTemp !== null && nowLine.targetTemp !== undefined) {
        const yPix = scales.y.getPixelForValue(nowLine.targetTemp)
        if (yPix >= chartArea.top && yPix <= chartArea.bottom) {
          ctx.beginPath()
          ctx.arc(xPix, yPix, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(95,138,120,1)'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.stroke()

          const label = `target ${Math.round(cToDisplay(nowLine.targetTemp))}°`
          ctx.font = 'bold 10px sans-serif'
          const nearRight = xPix + 8 + ctx.measureText(label).width > chartArea.right
          ctx.textAlign = nearRight ? 'right' : 'left'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = 'rgba(58,90,72,0.95)'
          ctx.fillText(label, xPix + (nearRight ? -8 : 8), yPix)
        }
      }
      ctx.restore()
    },
  }

  // Marker + label per witnessed drop, plus a hairline to that cone's reference
  // line. The gap between the two is the kiln's calibration, so it is drawn.
  const coneDropsPlugin = {
    id: 'coneDrops',
    afterDatasetsDraw(chart) {
      if (!lastConeDrops.length) return
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !scales?.x || !scales?.y) return
      const actual = chart.data.datasets[1]?.data ?? []
      ctx.save()
      for (const d of lastConeDrops) {
        const xPix = scales.x.getPixelForValue(d.minutes)
        if (xPix < chartArea.left - 0.5 || xPix > chartArea.right + 0.5) continue

        const tempC = d.tempC ?? targetAtMinute(actual, d.minutes)
        const yPix = tempC == null
          ? chartArea.top + 26
          : Math.max(chartArea.top + 22, scales.y.getPixelForValue(tempC) - 20)

        const ref = coneLines.find(l => l.name === d.cone)
        if (ref && tempC != null) {
          const refY  = scales.y.getPixelForValue(ref.tempC)
          const dropY = scales.y.getPixelForValue(tempC)
          if (Math.abs(refY - dropY) > 2 && refY >= chartArea.top && refY <= chartArea.bottom) {
            ctx.strokeStyle = 'rgba(95,138,120,0.5)'
            ctx.lineWidth = 1
            ctx.setLineDash([2, 3])
            ctx.beginPath()
            ctx.moveTo(xPix, dropY)
            ctx.lineTo(xPix, refY)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }

        ctx.beginPath()
        ctx.moveTo(xPix - 8, yPix - 6)
        ctx.lineTo(xPix + 8, yPix - 6)
        ctx.lineTo(xPix, yPix + 7)
        ctx.closePath()
        ctx.fillStyle = 'rgba(95,138,120,1)'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = 'rgba(63,99,84,1)'
        ctx.fillText(d.cone, xPix, yPix - 10)
      }
      ctx.restore()
    },
  }

  function isAlive() {
    if (!chart || !canvasRef.value) return false
    if (chart.canvas !== canvasRef.value) return false
    return canvasRef.value.isConnected
  }

  function ensureAlive() {
    if (isAlive()) return true
    if (!canvasRef.value || !canvasRef.value.isConnected) return false
    rebuild()
    return isAlive()
  }

  function rebuild() {
    try { chart?.destroy() } catch {}
    chart = null
    buildChart()
    if (lastSchedule.points.length) setSchedule(lastSchedule.points, lastSchedule.offset)
    if (lastReadings.rows.length)   setReadings(lastReadings.rows, lastReadings.startedAt)
    if (lastReductions.length)      setReductions(lastReductions, lastReductionsStartedAt)
    computeConeLines()
    // lastConeDrops is cached already-mapped; the plugin reads it directly.
  }

  // Fits in °C (the data space); only tick labels convert.
  function autoFitY() {
    if (!chart) return
    const allPoints = [
      ...(chart.data.datasets[0]?.data ?? []),
      ...(chart.data.datasets[1]?.data ?? []),
    ].map(p => p.y).filter(v => v != null && isFinite(v))
    if (!allPoints.length) return

    const dataMax = Math.max(...allPoints)
    const dataMin = Math.min(...allPoints)
    const range    = Math.max(dataMax - dataMin, 200)
    const headroom = range * 0.15

    chart.options.scales.y.min          = Math.max(Math.floor(dataMin - headroom * 0.5), 0)
    chart.options.scales.y.max          = Math.min(Math.ceil(dataMax + headroom), 1500)
    chart.options.scales.y.suggestedMax = chart.options.scales.y.max
  }

  async function init() {
    await ensureZoomPlugin()
    if (!canvasRef.value) await nextTick()
    if (!canvasRef.value) return
    buildChart()
  }

  function buildChart() {
    if (!canvasRef.value) return
    if (chart) { try { chart.destroy() } catch {} }

    const extraPlugins = [
      coneLinesPlugin, reductionBandsPlugin, nowLinePlugin, coneDropsPlugin,
      ...(showLabels ? [curveLabelsPlugin] : []),
    ]

    chart = new Chart(canvasRef.value, {
      type: 'line',
      plugins: extraPlugins,
      data: {
        datasets: [
          {
            label: 'Planned',
            data: [],
            borderColor: '#a8a29e',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: showLabels ? 4 : 5,
            pointBackgroundColor: '#a8a29e',
            tension: 0,
            fill: false,
          },
          {
            label: 'Actual',
            data: [],
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: showLabels ? 0 : 8,
            pointBackgroundColor: '#f97316',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0,
            fill: true,
          },
          {
            label: 'Signal lost',
            data: [],
            borderColor: '#f59e0b',
            borderDash: [4, 6],
            borderWidth: 2.5,
            pointRadius: [6, 0],
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#f59e0b',
            tension: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { right: coneLines.length ? CONE_GUTTER : NO_CONE_GUTTER } },
        onClick: (event, elements) => {
          if (!onPointClick) return
          const hit = elements.find(el => el.datasetIndex === 1)
          if (!hit) return
          const point = chart.data.datasets[1].data[hit.index]
          onPointClick({ index: hit.index, x: point.x, y: point.y, raw: point })
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#57534e',
              usePointStyle: true,
              pointStyleWidth: 16,
              filter: item => item.text !== 'Signal lost',
            },
          },
          tooltip: {
            enabled: !showLabels,
            backgroundColor: '#ffffff',
            borderColor: '#e7e5e4',
            borderWidth: 1,
            titleColor: '#1c1917',
            bodyColor: '#78716c',
            callbacks: {
              label: ctx => {
                if (ctx.dataset.label === 'Signal lost') return 'No signal'
                const c = ctx.parsed.y
                const v = c == null ? null : cToDisplay(c)
                return `${ctx.dataset.label}: ${v == null ? '—' : v.toFixed(1)}${unitLabel.value}`
              },
            },
          },
          zoom: enableZoom ? {
            pan: { enabled: true, mode: 'x' },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
            limits: { x: { min: 0, max: 120, minRange: 30 }, y: { min: 0, max: 1500 } },
          } : {
            pan: { enabled: false },
            zoom: { wheel: { enabled: false }, pinch: { enabled: false } },
          },
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: !showLabels, text: 'Minutes from start', color: '#78716c' },
            ticks: { color: '#a8a29e', maxTicksLimit: showLabels ? 5 : 8 },
            grid:  { color: '#f5f5f4' },
            min: 0,
          },
          y: {
            title: { display: false },
            ticks: {
              color: '#a8a29e',
              maxTicksLimit: showLabels ? 4 : 6,
              callback: (value) => Math.round(cToDisplay(value)) + '°',
            },
            grid: { color: '#f5f5f4' },
            min: 0,
            max: 300,
            suggestedMax: 300,
          },
        },
      },
    })
  }

  function setSchedule(points, offset = 0) {
    lastSchedule = { points: points ?? [], offset }
    if (!ensureAlive()) return
    chart.data.datasets[0].data = (points ?? []).map(p => ({
      x: p.offset_minutes + offset,
      y: p.target_temp,
    }))
    if (points?.length) {
      xMax = Math.max(...points.map(p => p.offset_minutes + offset)) + 60
      chart.options.scales.x.min = 0
      chart.options.scales.x.max = xMax
      if (chart.options.plugins.zoom?.limits?.x) chart.options.plugins.zoom.limits.x.max = xMax
    }
    autoFitY()
    computeConeLines()
    computeReductionBands()
    chart.update('none')
  }

  function setReadings(rows, startedAt) {
    lastReadings = { rows: rows ?? [], startedAt }
    if (!ensureAlive()) return
    chart.data.datasets[1].data = (rows ?? []).map(r => ({
      x:  Math.round((r.timestamp - startedAt) / 60),
      y:  r.temperature,
      id: r.id,
      ts: r.timestamp,
    }))
    autoFitY()
    computeConeLines()
    computeReductionBands()
    chart.update('none')
  }

  function setReductions(periods, startedAt = 0) {
    lastReductions = periods ?? []
    lastReductionsStartedAt = startedAt || 0
    if (!ensureAlive()) return
    computeReductionBands()
    chart.update('none')
  }

  // cones: /api/cones rows (needs temp_c). opts.pack: the firing's planned cone
  // names — the ruler becomes exactly these. opts.targetCone: name to
  // emphasise; otherwise the highest line under the plan's peak wins.
  function setConeLines(cones, opts = {}) {
    lastCones = (cones ?? [])
      .filter(c => Number.isFinite(Number(c.temp_c)))
      .map(c => ({ name: c.name, temp_c: Number(c.temp_c) }))
    packNames      = Array.isArray(opts.pack) ? opts.pack.filter(n => typeof n === 'string') : []
    targetConeName = opts.targetCone ?? null
    computeConeLines()
    if (!ensureAlive()) return
    chart.update('none')
  }

  function setConeDrops(drops, startedAt) {
    lastConeDrops = (drops ?? [])
      .filter(d => startedAt && d.dropped_at)
      .map(d => ({
        cone:    d.cone,
        minutes: Math.round((d.dropped_at - startedAt) / 60),
        tempC:   d.temp_at_drop ?? null,
      }))
    if (!ensureAlive()) return
    chart.update('none')
  }

  function setNowLine(startedAt) {
    if (!ensureAlive()) return
    if (!startedAt) { nowLine = null; chart.update('none'); return }
    const minutes = (Date.now() / 1000 - startedAt) / 60
    nowLine = { minutes, targetTemp: targetAtMinute(chart.data.datasets[0]?.data ?? [], minutes) }
    computeReductionBands()
    if (minutes > (chart.options.scales.x.max ?? 0)) chart.options.scales.x.max = minutes + 5
    chart.update('none')
  }

  function clearNowLine() {
    nowLine = null
    if (!ensureAlive()) return
    chart.update('none')
  }

  function setUnit() {
    if (!ensureAlive()) return
    chart.update('none')
  }

  function setManualMode(enabled) {
    if (!ensureAlive()) return
    chart.data.datasets[1].pointRadius      = showLabels ? 0 : (enabled ? 6 : 0)
    chart.data.datasets[1].pointHoverRadius = showLabels ? 0 : (enabled ? 10 : 4)
    if (canvasRef.value) canvasRef.value.style.cursor = enabled ? 'pointer' : 'default'
    chart.update('none')
  }

  function setSignalLost(startedAt, lastReadingTimestamp) {
    if (!ensureAlive()) return
    const nowMinutes = (Date.now() / 1000 - startedAt) / 60
    const actualData = chart.data.datasets[1].data
    let anchorX = 0, anchorY = 20

    if (lastReadingTimestamp !== null && actualData.length) {
      const lastPoint = actualData[actualData.length - 1]
      anchorX = lastPoint.x
      anchorY = lastPoint.y
    }

    const endX = Math.max(nowMinutes, anchorX + 0.5)
    chart.data.datasets[2].data = [{ x: anchorX, y: anchorY }, { x: endX, y: anchorY }]
    if (endX > (chart.options.scales.x.max ?? 0)) chart.options.scales.x.max = endX + 5
    autoFitY()
    chart.update('none')
  }

  function clearSignalLost() {
    if (!ensureAlive()) return
    chart.data.datasets[2].data = []
    chart.update('none')
  }

  function resetZoom() {
    if (!ensureAlive()) return
    chart.options.scales.x.min = 0
    chart.options.scales.x.max = xMax
    autoFitY()
    try { chart.resetZoom() } catch {}
    chart.update('none')
  }

  function resize() {
    if (!ensureAlive()) return
    try { chart.resize() } catch {}
    chart.update('none')
  }

  function destroy() {
    try { chart?.destroy() } catch {}
    chart = null
  }

  return {
    init, setSchedule, setReadings, setReductions,
    setConeLines, setConeDrops,
    setNowLine, clearNowLine, setUnit,
    setManualMode, setSignalLost, clearSignalLost, resetZoom, resize, destroy,
  }
}