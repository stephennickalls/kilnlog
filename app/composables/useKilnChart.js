// File: app/composables/useKilnChart.js
//
// G11 CHANGE SUMMARY (search "G11" for the spots):
//   - new reductionBandsPlugin: shaded vertical bands behind the curves,
//     one per reduction period, mapped from temperature → x(minutes) using
//     the ACTUAL readings curve. Drawn in beforeDatasetsDraw so it sits under
//     the planned/actual lines. Does NOT touch autoFitY (annotation, not data).
//   - new setReductions(periods) method + lastReductions cache (replayed on rebuild).
//   - reductions are stored on a closure var the plugin reads at draw time.

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
    const extraPlugins = [reductionBandsPlugin, ...(showLabels ? [curveLabelsPlugin] : [])]

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
    setManualMode, setSignalLost, clearSignalLost, resetZoom, resize, destroy,
  }
}