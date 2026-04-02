import { Chart, registerables, type ChartConfiguration } from 'chart.js'
Chart.register(...registerables)

export function useKilnChart(canvasRef: Ref<HTMLCanvasElement | null>) {
  let chart: Chart | null = null

  function init() {
    if (!canvasRef.value) return
    if (chart) chart.destroy()

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Planned',
            data: [] as any[],
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
            data: [] as any[],
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#57534e', usePointStyle: true, pointStyleWidth: 16 },
          },
          tooltip: {
            backgroundColor: '#ffffff',
            borderColor: '#e7e5e4',
            borderWidth: 1,
            titleColor: '#1c1917',
            bodyColor: '#78716c',
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? '—'}°C`,
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

  function setSchedule(points: { offset_minutes: number; target_temp: number }[]) {
    if (!chart) return
    ;(chart.data.datasets[0] as any).data = points.map(p => ({
      x: p.offset_minutes,
      y: p.target_temp,
    }))
    if (points.length) {
      const maxX = Math.max(...points.map(p => p.offset_minutes))
      const maxY = Math.max(...points.map(p => p.target_temp))
      ;(chart.options.scales!.x as any).max          = maxX
      ;(chart.options.scales!.y as any).suggestedMax = maxY + 50
    }
    chart.update('none')
  }

  function setReadings(rows: { timestamp: number; temperature: number }[], startedAt: number) {
    if (!chart) return
    ;(chart.data.datasets[1] as any).data = rows.map(r => ({
      x: Math.round((r.timestamp - startedAt) / 60),
      y: r.temperature,
    }))
    chart.update('none')
  }

  function destroy() {
    chart?.destroy()
    chart = null
  }

  return { init, setSchedule, setReadings, destroy }
}