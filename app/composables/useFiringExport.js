// File: app/composables/useFiringExport.js
//
// PACKAGE 6 — G3 firing export. Pure client-side CSV build from a firing that
// already has its schedule + readings loaded (the shape returned by
// GET /api/firings/:id). No network call.
//
// Output is one .csv with three sections so a potter's full record travels in
// a single file that opens cleanly in Excel / Google Sheets / Numbers:
//   1. METADATA   — name, notes, start/end, duration, peak, reading count
//   2. READINGS   — timestamp (ISO + unix), minutes from start, temperature
//   3. SCHEDULE   — planned waypoints (offset minutes, target temp), offset-adjusted
//
// Temperatures are °C (matching the app). If/when a °F preference lands (G1),
// pass a converter in and label the column accordingly.

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  // Quote if it contains comma, quote, newline, or leading/trailing space.
  if (/[",\n\r]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(cells) {
  return cells.map(csvEscape).join(',')
}

function fmtUnixIso(unix) {
  if (!Number.isFinite(unix)) return ''
  return new Date(unix * 1000).toISOString()
}

function fmtDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Safe filename: "kilnmonitor_<name>_<date>.csv"
function buildFilename(firing) {
  const base = (firing?.name ?? 'firing')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'firing'
  const stamp = firing?.started_at
    ? new Date(firing.started_at * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  return `kilnmonitor_${base}_${stamp}.csv`
}

export function buildFiringCsv(firing) {
  const readings = [...(firing.readings ?? [])].sort((a, b) => a.timestamp - b.timestamp)
  const schedule = [...(firing.schedule ?? [])].sort((a, b) => a.offset_minutes - b.offset_minutes)
  const offset   = firing.schedule_offset ?? 0
  const startedAt = firing.started_at ?? null

  const peak = readings.length
    ? Math.round(readings.reduce((mx, r) => r.temperature > mx ? r.temperature : mx, readings[0].temperature))
    : null

  const durationSecs = (startedAt && firing.ended_at) ? firing.ended_at - startedAt : null

  const lines = []

  // ── Section 1: metadata ────────────────────────────────────────────────────
  lines.push(row(['KilnMonitor firing export']))
  lines.push(row(['Name', firing.name ?? '']))
  lines.push(row(['Notes', firing.notes ?? '']))
  lines.push(row(['Started (ISO)', fmtUnixIso(startedAt)]))
  lines.push(row(['Ended (ISO)', fmtUnixIso(firing.ended_at)]))
  lines.push(row(['Duration', fmtDuration(durationSecs)]))
  lines.push(row(['Auto-ended', firing.auto_ended ? 'yes' : 'no']))
  lines.push(row(['Peak temperature (C)', peak ?? '']))
  lines.push(row(['Readings logged', readings.length]))
  lines.push(row(['Schedule offset (min)', offset]))
  lines.push(row(['Exported (ISO)', new Date().toISOString()]))
  lines.push('')

  // ── Section 2: readings ─────────────────────────────────────────────────────
  lines.push(row(['READINGS']))
  lines.push(row(['Timestamp (ISO)', 'Unix', 'Minutes from start', 'Temperature (C)']))
  for (const r of readings) {
    const minsFromStart = startedAt ? Math.round((r.timestamp - startedAt) / 60) : ''
    lines.push(row([fmtUnixIso(r.timestamp), r.timestamp, minsFromStart, r.temperature]))
  }
  lines.push('')

  // ── Section 3: planned schedule ─────────────────────────────────────────────
  lines.push(row(['PLANNED SCHEDULE']))
  lines.push(row(['Offset minutes', 'Offset minutes (adjusted)', 'Target temp (C)']))
  for (const p of schedule) {
    lines.push(row([p.offset_minutes, p.offset_minutes + offset, p.target_temp]))
  }

  return lines.join('\r\n')
}

export function useFiringExport() {
  function exportFiring(firing) {
    if (!firing) return
    const csv = buildFiringCsv(firing)
    // Prepend BOM so Excel reads UTF-8 correctly (names/notes with accents).
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = buildFilename(firing)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revoke on next tick so the download has grabbed the blob.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return { exportFiring, buildFiringCsv, buildFilename }
}