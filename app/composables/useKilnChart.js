import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

let zoomPluginRegistered = false

async function ensureZoomPlugin() {
  if (zoomPluginRegistered) return
  const { default: zoomPlugin } = await import('chartjs-plugin-zoom')
  Chart.register(zoomPlugin)
  zoomPluginRegistered = true
}

export function useKilnChart(canvasRef, { onPointClick } = {}) {
  let chart = null

  async function init() {
    if (!canvasRef.value) return
    if (chart) chart.destroy()

    await ensureZoomPlugin()

    const config = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Planned',
            data: [],
            borderColor: '#a8a29e',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: '#a8a29e',
            tension: 0.35,
            fill: false,
          },
          {
            label: 'Actual',
            data: [],
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 8,
            pointBackgroundColor: '#f97316',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.2,
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
        maintainAspectRatio: true,
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
          zoom: {
            pan: { enabled: true, mode: 'xy' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'xy',
            },
            limits: {
              x: { min: 0 },
              y: { min: 0 },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Minutes from start', color: '#78716c' },
            ticks: { color: '#a8a29e' },
            grid:  { color: '#f5f5f4' },
            min: 0,
          },
          y: {
            title: { display: true, text: 'Temperature (°C)', color: '#78716c' },
            ticks: { color: '#a8a29e' },
            grid:  { color: '#f5f5f4' },
            min: 0,
            suggestedMax: 100,
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
      chart.options.scales.x.max          = maxX
      chart.options.scales.x.min          = 0
      chart.options.scales.y.suggestedMax = maxY + 50
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
    chart.data.datasets[1].pointRadius      = enabled ? 6 : 0
    chart.data.datasets[1].pointHoverRadius = enabled ? 10 : 4
    canvasRef.value.style.cursor = enabled ? 'pointer' : 'default'
    chart.update('none')
  }

  function setSignalLost(startedAt, lastReadingTimestamp) {
    if (!chart) return

    const nowMinutes = (Date.now() / 1000 - startedAt) / 60
    let anchorX, anchorY

    if (lastReadingTimestamp === null) {
      anchorX = 0
      anchorY = 20
      console.log(`[KilnChart] setSignalLost — no readings, drawing from (0, 20°C) to (${nowMinutes.toFixed(1)}min, 20°C)`)
    } else {
      const actualData = chart.data.datasets[1].data
      if (!actualData.length) {
        anchorX = 0
        anchorY = 20
      } else {
        const lastPoint = actualData[actualData.length - 1]
        anchorX = lastPoint.x
        anchorY = lastPoint.y
        console.log(`[KilnChart] setSignalLost — last reading at (${anchorX}min, ${anchorY}°C), extending to ${nowMinutes.toFixed(1)}min`)
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
    console.log('[KilnChart] clearSignalLost')
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