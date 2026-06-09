// app/composables/useKilnChart.js

import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

let zoomPluginRegistered = false

async function ensureZoomPlugin() {
  if (zoomPluginRegistered) return
  const { default: zoomPlugin } = await import('chartjs-plugin-zoom')
  Chart.register(zoomPlugin)
  zoomPluginRegistered = true
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

  // Remember the latest data pushed in, so if we have to rebuild the chart
  // (e.g. Vue recreated the canvas during a long session) we can restore it.
  let lastSchedule = { points: [], offset: 0 }
  let lastReadings = { rows: [], startedAt: 0 }

  // True only when `chart` exists AND is still bound to the canvas that is
  // currently in the DOM. Over a long session Vue can tear down and recreate
  // the <canvas> (v-if branches flipping, etc.), leaving the Chart.js instance
  // pointing at a detached element — it goes unresponsive and the surrounding
  // controls (reset button) blink out. We detect that and rebuild.
  function isAlive() {
    if (!chart || !canvasRef.value) return false
    // chart.canvas is the element Chart.js is actually drawing to.
    if (chart.canvas !== canvasRef.value) return false
    // If the canvas is no longer in the document, it's detached.
    if (!canvasRef.value.isConnected) return false
    return true
  }

  // Guard run at the top of every mutating call. If the chart died, rebuild it
  // synchronously and replay the last schedule/readings so nothing is lost.
  // Returns false if we genuinely can't draw yet (no canvas in DOM).
  function ensureAlive() {
    if (isAlive()) return true
    if (!canvasRef.value || !canvasRef.value.isConnected) return false
    rebuild()
    return isAlive()
  }

  // Synchronous rebuild — assumes the zoom plugin is already registered
  // (it always is after the first init()).
  function rebuild() {
    try { chart?.destroy() } catch {}
    chart = null
    buildChart()
    // Replay data
    if (lastSchedule.points.length) setSchedule(lastSchedule.points, lastSchedule.offset)
    if (lastReadings.rows.length)   setReadings(lastReadings.rows, lastReadings.startedAt)
  }

  // ── Auto-fit y-axis to the visible data range ─────────────────────────────
  // Instead of always showing 0–1500, we look at what's actually plotted and
  // give it 15% headroom above and a 50°C floor below, so the curve fills the
  // chart area rather than sitting in a thin strip at the bottom.
  // During the flat early stage (all points < 300°C) this is especially
  // important — without it a 129°C reading is invisible on a 1500°C axis.
  function autoFitY() {
    if (!chart) return
    const allPoints = [
      ...(chart.data.datasets[0]?.data ?? []),
      ...(chart.data.datasets[1]?.data ?? []),
    ].map(p => p.y).filter(v => v != null && isFinite(v))

    if (!allPoints.length) return

    const dataMax = Math.max(...allPoints)
    const dataMin = Math.min(...allPoints)

    // Always show at least a 200°C window so low-temp early stages look right.
    const range      = Math.max(dataMax - dataMin, 200)
    const headroom   = range * 0.15
    const yMax       = Math.min(Math.ceil(dataMax + headroom), 1500)
    const yMin       = Math.max(Math.floor(dataMin - headroom * 0.5), 0)

    chart.options.scales.y.min          = yMin
    chart.options.scales.y.suggestedMax = yMax
    chart.options.scales.y.max          = yMax
  }

  async function init() {
    if (!canvasRef.value) return
    await ensureZoomPlugin()
    buildChart()
  }

  function buildChart() {
    if (!canvasRef.value) return
    if (chart) { try { chart.destroy() } catch {} }

    const extraPlugins = showLabels ? [curveLabelsPlugin] : []

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
            max: 300,           // sensible initial ceiling — autoFitY takes over
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

  // Force a re-measure of the canvas against its container. Call after the
  // canvas remounts into a freshly laid-out container (state switch) so
  // Chart.js doesn't keep a stale (squished) size.
  function resize() {
    if (!ensureAlive()) return
    try { chart.resize() } catch {}
    chart.update('none')
  }

  function destroy() {
    try { chart?.destroy() } catch {}
    chart = null
  }

  return { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, resize, destroy }
}