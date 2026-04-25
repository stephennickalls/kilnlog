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
// Draws temp labels at each schedule waypoint and the last actual reading.
// Only registered on mobile (showLabels: true) instances.
const curveLabelsPlugin = {
  id: 'curveLabels',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx

    // Labels on schedule waypoints
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
        const label = `${Math.round(pt.y)}°`
        // Alternate above/below to avoid overlap on tight segments
        const offset = i % 2 === 0 ? -14 : 14
        ctx.fillText(label, x, y + offset)
      })
      ctx.restore()
    }

    // Label on the last actual reading point
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

/**
 * @typedef {{ onPointClick?: (point: any) => void; enableZoom?: boolean; showLabels?: boolean }} KilnChartOptions
 */

/**
 * @param {import('vue').Ref<HTMLCanvasElement | null>} canvasRef
 * @param {KilnChartOptions} [options]
 */
export function useKilnChart(canvasRef, { onPointClick, enableZoom = true, showLabels = false } = {}) {
  let chart = null
  let xMax  = 120

  async function init() {
    if (!canvasRef.value) return
    if (chart) chart.destroy()

    await ensureZoomPlugin()

    // Register the label plugin only when needed
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
            // Disable entirely on mobile — labels do the job
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
            suggestedMax: 200,
          },
        },
      },
    }

    chart = new Chart(canvasRef.value, config)
  }

  function setSchedule(points) {
    if (!chart) return
    chart.data.datasets[0].data = points.map(p => ({
      x: p.offset_minutes,
      y: p.target_temp,
    }))
    if (points.length) {
      const maxX = Math.max(...points.map(p => p.offset_minutes))
      const maxY = Math.max(...points.map(p => p.target_temp))
      xMax = maxX + 60
      chart.options.scales.x.min = 0
      chart.options.scales.x.max = xMax
      chart.options.scales.y.suggestedMax = Math.min(maxY + 50, 1500)
      if (chart.options.plugins.zoom?.limits?.x) {
        chart.options.plugins.zoom.limits.x.max = xMax
      }
    }
    chart.update('none')
  }

  function setReadings(rows, startedAt) {
    if (!chart) return
    chart.data.datasets[1].data = rows.map(r => ({
      x:  Math.round((r.timestamp - startedAt) / 60),
      y:  r.temperature,
      id: r.id,
      ts: r.timestamp,
    }))
    chart.update('none')
  }

  function setManualMode(enabled) {
    if (!chart) return
    // On label mode, always keep pointRadius 0 on the actual line (label shows the value)
    chart.data.datasets[1].pointRadius      = showLabels ? 0 : (enabled ? 6 : 0)
    chart.data.datasets[1].pointHoverRadius = showLabels ? 0 : (enabled ? 10 : 4)
    if (canvasRef.value) canvasRef.value.style.cursor = enabled ? 'pointer' : 'default'
    chart.update('none')
  }

  function setSignalLost(startedAt, lastReadingTimestamp) {
    if (!chart) return
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

    const currentSuggestedMax = chart.options.scales.y.suggestedMax ?? 100
    if (anchorY + 20 > currentSuggestedMax) chart.options.scales.y.suggestedMax = anchorY + 20

    chart.update('none')
  }

  function clearSignalLost() {
    if (!chart) return
    chart.data.datasets[2].data = []
    chart.update('none')
  }

  function resetZoom() {
    chart?.resetZoom()
  }

  function destroy() {
    chart?.destroy()
    chart = null
  }

  return { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, destroy }
}