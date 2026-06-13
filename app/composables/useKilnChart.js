// File: app/composables/useKilnChart.js
//
// G11 CHANGE SUMMARY (search "G11" for the spots):
//   - new reductionBandsPlugin: shaded vertical bands behind the curves,
//     one per reduction period, mapped from temperature → x(minutes) using
//     the ACTUAL readings curve. Drawn in beforeDatasetsDraw so it sits under
//     the planned/actual lines. Does NOT touch autoFitY (annotation, not data).
//   - new setReductions(periods) method + lastReductions cache (replayed on rebuild).
//   - reductions are stored on a closure var the plugin reads at draw time.
//
// NOW-LINE CHANGE SUMMARY (search "NOW-LINE"):
//   - new nowLinePlugin: a vertical "you are here" line at the current elapsed
//     minute, drawn in afterDatasetsDraw so it sits ON TOP of the curves. It
//     gives an at-a-glance read of where the firing is RIGHT NOW, independent
//     of the last logged reading (which may be minutes stale). A small marker
//     shows the PLANNED target temp at this moment ("target now: 920°").
//   - new setNowLine(startedAt) + clearNowLine() methods. Caller ticks
//     setNowLine on the existing 1s interval. Live firings only.
//   - Pure annotation: never feeds autoFitY, never alters data. Mirrors the
//     reduction-band pattern exactly (closure var read at draw time).
//   - x-space note: readings map to chart-x as (ts - startedAt)/60 with NO
//     offset; setSchedule bakes scheduleOffset into the planned x. So the
//     now-line x is simply elapsed minutes, and the planned-target lookup uses
//     that same x against the already-offset planned curve. No offset arg needed.

import { nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// ── Zoom plugin: browser-only, lazy registration ──────────────────────────────
let zoomReady = false
let zoomRegisterPromise = null

function ensureZoomPlugin() {
  if (zoomReady) return Promise.resolve()
  if (!import.meta.client) return Promise.resolve()
  if (zoomRegisterPromise) return zoomRegisterPromise
  zoomRegisterPromise = import('chartjs-plugin-zoom')
    .then(({ default: zoomPlugin }) => {
      Chart.register(zoomPlugin)
      zoomReady = true
      console.debug('[useKilnChart] zoom plugin registered (lazy)')
    })
    .catch(err => console.error('[useKilnChart] FAILED to register zoom plugin:', err))
  return zoomRegisterPromise
}

// ── Inline label plugin ───────────────────────────────────────────────────────
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
      scheduleData.forEach((pt, i) => {
        const meta = chart.getDatasetMeta(0)
        const el   = meta.data[i]
        if (!el) return
        const { x, y } = el.getProps(['x', 'y'], true)
        const offset = i % 2 === 0 ? -14 : 14
        ctx.fillText(`${Math.round(pt.y)}°`, x, y + offset)
      })
      ctx.restore()
    }

    const actualData = chart.data.datasets[1]?.data ?? []
    if (actualData.length) {
      const meta    = chart.getDatasetMeta(1)
      const lastIdx = actualData.length - 1
      const el      = meta.data[lastIdx]
      if (el) {
        const { x, y } = el.getProps(['x', 'y'], true)
        const lastPt   = actualData[lastIdx]
        ctx.save()
        ctx.font      = 'bold 11px sans-serif'
        ctx.fillStyle = '#f97316'
        ctx.textAlign = 'left'
        ctx.fillText(`${Math.round(lastPt.y)}°`, x + 5, y - 6)
        ctx.restore()
      }
    }
  },
}

export function useKilnChart(canvasRef, { onPointClick, enableZoom = true, showLabels = false } = {}) {
  let chart = null
  let xMax  = 120

  let lastSchedule   = { points: [], offset: 0 }
  let lastReadings   = { rows: [], startedAt: 0 }
  let lastReductions = []                                  // G11: cache for rebuild

  // G11: live reference the plugin reads at draw time. Each entry:
  //   { startX, endX } in minutes, already mapped from temperature.
  let reductionBands = []

  // NOW-LINE: live reference the plugin reads at draw time.
  //   null = not shown; otherwise { minutes, targetTemp }.
  let nowLine = null

  // G11: map a temperature to the x(minute) where the ACTUAL curve first
  // reaches it (linear interpolation between bracketing readings). Returns null
  // if the curve never reaches that temp.
  function minuteAtTemp(actualPoints, temp) {
    if (!actualPoints.length) return null
    for (let i = 0; i < actualPoints.length - 1; i++) {
      const a = actualPoints[i], b = actualPoints[i + 1]
      const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y)
      if (temp >= lo && temp <= hi) {
        const span = b.y - a.y
        const frac = span === 0 ? 0 : (temp - a.y) / span
        return a.x + frac * (b.x - a.x)
      }
    }
    // Temp beyond the curve's range: clamp to nearest end if close, else null.
    const first = actualPoints[0], last = actualPoints[actualPoints.length - 1]
    if (temp <= Math.min(first.y, last.y)) return first.x
    return null
  }

  // NOW-LINE: map an x(minute) to the PLANNED curve's y(temp) — the inverse
  // direction of minuteAtTemp. Linear interpolation between bracketing planned
  // points; clamps to the first/last point outside the curve's time range.
  // Returns null only if there's no planned curve.
  function targetAtMinute(plannedPoints, minute) {
    if (!plannedPoints.length) return null
    if (minute <= plannedPoints[0].x) return plannedPoints[0].y
    const last = plannedPoints[plannedPoints.length - 1]
    if (minute >= last.x) return last.y
    for (let i = 0; i < plannedPoints.length - 1; i++) {
      const a = plannedPoints[i], b = plannedPoints[i + 1]
      if (minute >= a.x && minute <= b.x) {
        const span = b.x - a.x
        const frac = span === 0 ? 0 : (minute - a.x) / span
        return a.y + frac * (b.y - a.y)
      }
    }
    return null
  }

  // G11: recompute pixel-independent band x-ranges from periods + current actual
  // data. Called by setReductions and whenever readings change.
  function computeReductionBands() {
    const actual = chart?.data?.datasets?.[1]?.data ?? []
    const bands = []
    for (const p of lastReductions) {
      const startX = minuteAtTemp(actual, p.start_temp)
      if (startX === null) continue
      let endX
      if (p.end_temp === null || p.end_temp === undefined) {
        // Open/in-progress: run to the latest reading (the live edge).
        endX = actual.length ? actual[actual.length - 1].x : startX
      } else {
        const e = minuteAtTemp(actual, p.end_temp)
        endX = e === null
          ? (actual.length ? actual[actual.length - 1].x : startX)
          : e
      }
      if (endX < startX) [endX] = [startX]                 // guard
      bands.push({ startX, endX, open: p.end_temp == null })
    }
    reductionBands = bands
  }

  // G11: draw bands behind the curves.
  const reductionBandsPlugin = {
    id: 'reductionBands',
    beforeDatasetsDraw(chart) {
      if (!reductionBands.length) return
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !scales?.x) return
      ctx.save()
      for (const band of reductionBands) {
        const xPix1 = scales.x.getPixelForValue(band.startX)
        const xPix2 = scales.x.getPixelForValue(band.endX)
        const left  = Math.max(Math.min(xPix1, xPix2), chartArea.left)
        const right = Math.min(Math.max(xPix1, xPix2), chartArea.right)
        const width = Math.max(right - left, 1.5)          // hairline if zero-width

        // Reduction = cooler-flame smoky tone; semi-transparent slate/blue.
        ctx.fillStyle = band.open ? 'rgba(99,102,241,0.10)' : 'rgba(71,85,105,0.12)'
        ctx.fillRect(left, chartArea.top, width, chartArea.bottom - chartArea.top)

        // Left edge marker.
        ctx.strokeStyle = band.open ? 'rgba(99,102,241,0.55)' : 'rgba(71,85,105,0.5)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(left, chartArea.top)
        ctx.lineTo(left, chartArea.bottom)
        ctx.stroke()
        ctx.setLineDash([])

        // Label near the top of the band.
        if (width > 30) {
          ctx.font = 'bold 9px sans-serif'
          ctx.fillStyle = band.open ? 'rgba(79,70,229,0.9)' : 'rgba(51,65,85,0.8)'
          ctx.textAlign = 'left'
          ctx.fillText(band.open ? 'Reduction…' : 'Reduction', left + 4, chartArea.top + 12)
        }
      }
      ctx.restore()
    },
  }

  // NOW-LINE: draw the current-time line + target marker ON TOP of the curves.
  const nowLinePlugin = {
    id: 'nowLine',
    afterDatasetsDraw(chart) {
      if (!nowLine) return
      const { ctx, chartArea, scales } = chart
      if (!chartArea || !scales?.x || !scales?.y) return

      const xPix = scales.x.getPixelForValue(nowLine.minutes)
      // Don't draw if "now" is off the visible (possibly zoomed) area.
      if (xPix < chartArea.left - 0.5 || xPix > chartArea.right + 0.5) return

      ctx.save()

      // The vertical line — celadon, solid, distinct from the dashed planned
      // curve and the orange actual curve.
      ctx.strokeStyle = 'rgba(95,138,120,0.9)'   // celadon
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(xPix, chartArea.top)
      ctx.lineTo(xPix, chartArea.bottom)
      ctx.stroke()

      // "NOW" tag at the top of the line.
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

      // Target-temp marker: a dot on the planned curve at "now" + a label.
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

          // Label — flip side near the right edge so it stays on-canvas.
          const label = `target ${Math.round(nowLine.targetTemp)}°`
          ctx.font = 'bold 10px sans-serif'
          const lblW = ctx.measureText(label).width
          const nearRight = xPix + 8 + lblW > chartArea.right
          ctx.textAlign = nearRight ? 'right' : 'left'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = 'rgba(58,90,72,0.95)'   // celadon-dark
          ctx.fillText(label, xPix + (nearRight ? -8 : 8), yPix)
        }
      }

      ctx.restore()
    },
  }

  function isAlive() {
    if (!chart || !canvasRef.value) return false
    if (chart.canvas !== canvasRef.value) return false
    if (!canvasRef.value.isConnected) return false
    return true
  }

  function ensureAlive() {
    if (isAlive()) return true
    if (!canvasRef.value || !canvasRef.value.isConnected) return false
    console.debug('[useKilnChart] chart not alive — rebuilding')
    rebuild()
    return isAlive()
  }

  function rebuild() {
    try { chart?.destroy() } catch {}
    chart = null
    buildChart()
    if (lastSchedule.points.length) setSchedule(lastSchedule.points, lastSchedule.offset)
    if (lastReadings.rows.length)   setReadings(lastReadings.rows, lastReadings.startedAt)
    if (lastReductions.length)      setReductions(lastReductions)   // G11
    // NOW-LINE: nowLine closure var survives rebuild; next chart.update repaints it.
  }

  function autoFitY() {
    if (!chart) return
    const allPoints = [
      ...(chart.data.datasets[0]?.data ?? []),
      ...(chart.data.datasets[1]?.data ?? []),
    ].map(p => p.y).filter(v => v != null && isFinite(v))

    if (!allPoints.length) return

    const dataMax = Math.max(...allPoints)
    const dataMin = Math.min(...allPoints)

    const range      = Math.max(dataMax - dataMin, 200)
    const headroom   = range * 0.15
    const yMax       = Math.min(Math.ceil(dataMax + headroom), 1500)
    const yMin       = Math.max(Math.floor(dataMin - headroom * 0.5), 0)

    chart.options.scales.y.min          = yMin
    chart.options.scales.y.suggestedMax = yMax
    chart.options.scales.y.max          = yMax
  }

  async function init() {
    await ensureZoomPlugin()
    if (!canvasRef.value) await nextTick()
    if (!canvasRef.value) {
      console.warn('[useKilnChart] init() — canvas ref still null after nextTick; skipping build')
      return
    }
    buildChart()
  }

  function buildChart() {
    if (!canvasRef.value) return
    if (chart) { try { chart.destroy() } catch {} }

    // G11: reductionBandsPlugin always on (cheap no-op when no bands); labels optional.
    // NOW-LINE: nowLinePlugin always on (cheap no-op when nowLine is null).
    const extraPlugins = [reductionBandsPlugin, nowLinePlugin, ...(showLabels ? [curveLabelsPlugin] : [])]

    const config = {
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
                if (ctx.dataset.label === 'Signal lost') return '⚠️ No signal'
                return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? '—'}°C`
              },
            },
          },
          zoom: enableZoom ? {
            pan: { enabled: true, mode: 'x' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x',
            },
            limits: {
              x: { min: 0, max: 120, minRange: 30 },
              y: { min: 0, max: 1500 },
            },
          } : {
            pan: { enabled: false },
            zoom: {
              wheel: { enabled: false },
              pinch: { enabled: false },
            },
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
            ticks: { color: '#a8a29e', maxTicksLimit: showLabels ? 4 : 6 },
            grid:  { color: '#f5f5f4' },
            min: 0,
            max: 300,
            suggestedMax: 300,
          },
        },
      },
    }

    chart = new Chart(canvasRef.value, config)
  }

  function setSchedule(points, offset = 0) {
    lastSchedule = { points: points ?? [], offset }
    if (!ensureAlive()) return
    chart.data.datasets[0].data = points.map(p => ({
      x: p.offset_minutes + offset,
      y: p.target_temp,
    }))
    if (points.length) {
      const maxX = Math.max(...points.map(p => p.offset_minutes + offset))
      xMax = maxX + 60
      chart.options.scales.x.min = 0
      chart.options.scales.x.max = xMax
      if (chart.options.plugins.zoom?.limits?.x) {
        chart.options.plugins.zoom.limits.x.max = xMax
      }
    }
    autoFitY()
    chart.update('none')
  }

  function setReadings(rows, startedAt) {
    lastReadings = { rows: rows ?? [], startedAt }
    if (!ensureAlive()) return
    chart.data.datasets[1].data = rows.map(r => ({
      x:  Math.round((r.timestamp - startedAt) / 60),
      y:  r.temperature,
      id: r.id,
      ts: r.timestamp,
    }))
    autoFitY()
    computeReductionBands()        // G11: bands depend on the actual curve
    chart.update('none')
  }

  // G11: set/replace the reduction periods. Accepts the raw rows
  // ({ start_temp, end_temp, ... }) from the firing payload.
  function setReductions(periods) {
    lastReductions = periods ?? []
    if (!ensureAlive()) return
    computeReductionBands()
    chart.update('none')
  }

  // NOW-LINE: position the current-time line. Call on each live tick.
  //   startedAt — firing.started_at (unix seconds).
  // Computes elapsed minutes (chart-x) and the planned target temp at that x.
  // Extends the x-axis max so the line stays visible as the firing outruns the
  // planned curve. No-op-safe; cheap enough to call every second.
  function setNowLine(startedAt) {
    if (!ensureAlive()) return
    if (!startedAt) { nowLine = null; chart.update('none'); return }

    const minutes = (Date.now() / 1000 - startedAt) / 60
    const planned = chart.data.datasets[0]?.data ?? []
    const targetTemp = targetAtMinute(planned, minutes)
    nowLine = { minutes, targetTemp }

    // Keep "now" on-canvas once the firing runs past the planned end.
    const currentMax = chart.options.scales.x.max ?? 0
    if (minutes > currentMax) chart.options.scales.x.max = minutes + 5

    chart.update('none')
  }

  // NOW-LINE: hide it (ended firings, or on deselect).
  function clearNowLine() {
    nowLine = null
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
    let anchorX, anchorY

    if (lastReadingTimestamp === null) {
      anchorX = 0
      anchorY = 20
    } else {
      const actualData = chart.data.datasets[1].data
      if (!actualData.length) {
        anchorX = 0
        anchorY = 20
      } else {
        const lastPoint = actualData[actualData.length - 1]
        anchorX = lastPoint.x
        anchorY = lastPoint.y
      }
    }

    const endX = Math.max(nowMinutes, anchorX + 0.5)
    chart.data.datasets[2].data = [
      { x: anchorX, y: anchorY },
      { x: endX,    y: anchorY },
    ]

    const currentMax = chart.options.scales.x.max ?? 0
    if (endX > currentMax) chart.options.scales.x.max = endX + 5

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
    init, setSchedule, setReadings, setReductions,   // G11: setReductions exported
    setNowLine, clearNowLine,                         // NOW-LINE
    setManualMode, setSignalLost, clearSignalLost, resetZoom, resize, destroy,
  }
}