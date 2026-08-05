// File: app/composables/useSchedulePaste.js
//
// Parses a firing schedule that someone PASTED — from a forum post, a supplier
// blog, Glazy, a studio handout, a photo they retyped, their own notes.
//
// WHY THIS EXISTS: there is no interchange format for firing schedules. The de
// facto one is prose steps, and it's remarkably consistent across sources:
//
//     Step 1: 80°F/Hr to 250°F. Hold for 60 minutes.
//     150  250   0
//     Ramp at 100°C/hr to 600°C, hold 20 min
//     1 | 150 | 250 | 0 | 1:12          ← Glazy table, last col is derived
//     AFAP to 1832°F hold 10
//     rA1 300  °F1 240  HLd1 60         ← keyed off a controller
//
// All of those are rate → target → hold, which is exactly our segment model
// (useCurveSegments), so parsing lands directly on something we can store.
//
// UNITS: the pasted text carries its OWN unit, independent of the user's
// display toggle — most schedules in circulation are °F. So this file does its
// own conversion and always RETURNS °C. It never calls useTempUnit's toCelsius,
// which converts from whatever the user is currently *viewing* in.
//
// Rates convert by the ratio only (×5/9), temperatures take the −32 offset.
// Mixing those up is the classic bug and it's silent — a 150°F/hr ramp becomes
// 66°C/hr, not 83°C/hr, if you subtract 32 from a rate.
//
// PHILOSOPHY: parse permissively, report honestly. Anything unparsed comes back
// in `warnings` rather than being dropped silently, and the caller shows a
// preview before anything is saved. A wrong curve the user can see and fix
// beats a refusal to import.

import { FULL_RATE, segmentsToPoints } from '~/composables/useCurveSegments'

const DEFAULT_AMBIENT_C = 20

// ── Small helpers ─────────────────────────────────────────────────────────────
const fToC     = f => (f - 32) * 5 / 9      // absolute temperature
const fRateToC = f => f * 5 / 9             // a rate/delta: ratio only, NO offset

function tidy(text) {
  return String(text ?? '')
    .replace(/\u00a0/g, ' ')                       // nbsp
    .replace(/[\u2012-\u2015\u2212]/g, '-')        // fancy dashes → hyphen
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00ba|\u00b0/g, '°')
    // "Step 2:" mid-line means a new row; same for "Segment 3" and "Ramp 4".
    .replace(/(?:^|\s)((?:step|segment|seg|ramp)\s*\d+\s*[:.)-])/gi, '\n$1')
    .replace(/;/g, '\n')
}

// Hold values arrive as minutes ("60"), as h:mm ("1:30"), or in the Bartlett
// keypad convention where the decimal point separates hours from minutes
// ("1.30" = 90 minutes, NOT 1.3 minutes). Two digits after the separator is the
// tell — "0.5" stays half a minute, "1.30" becomes ninety.
export function parseHold(raw, unitWord) {
  if (raw == null) return 0
  const s = String(raw).trim()

  const hm = s.match(/^(\d+)\s*[:.]\s*(\d{2})$/)
  if (hm) return Number(hm[1]) * 60 + Number(hm[2])

  const n = Number(s)
  if (!Number.isFinite(n)) return 0
  if (unitWord && /^h/i.test(unitWord)) return Math.round(n * 60)
  return Math.round(n)
}

// Which unit is this text written in? Explicit markers win; otherwise magnitude
// decides — our storage cap is 1400°C, so any target above that has to be °F.
export function detectUnit(text) {
  const t = text.toLowerCase()
  const f = (t.match(/°\s*f|\bf\s*\/\s*h|fahrenheit/g) || []).length
  const c = (t.match(/°\s*c|\bc\s*\/\s*h|celsius|centigrade/g) || []).length
  if (f > c) return { unit: 'F', guessed: false }
  if (c > f) return { unit: 'C', guessed: false }

  const nums = (t.match(/\d{3,4}/g) || []).map(Number)
  const peak = nums.length ? Math.max(...nums.filter(n => n !== FULL_RATE)) : 0
  if (peak > 1400) return { unit: 'F', guessed: true }
  return { unit: 'C', guessed: true }
}

const RATE_WORD = /\b(afap|full|max(?:imum)?|as\s+fast\s+as\s+possible)\b/i
const HEADER    = /\b(rate|target|temp(?:erature)?|hold|soak|ramp|segment|time)\b/i

// ── The parser ────────────────────────────────────────────────────────────────
// Returns { segments, points, unit, unitGuessed, ambientC, cone, type,
//           warnings, skipped }
// `segments` are °C: [{ rate, target, hold }] with rate = FULL_RATE for AFAP.
export function parseSchedule(text) {
  const raw = tidy(text)
  if (!raw.trim()) {
    return { segments: [], points: [], unit: 'C', unitGuessed: false, ambientC: DEFAULT_AMBIENT_C, cone: null, type: null, warnings: [], skipped: [] }
  }

  const { unit, guessed } = detectUnit(raw)
  const warnings = []
  const skipped  = []

  // Metadata that might be sitting anywhere in the blob.
  const coneMatch = raw.match(/\bcone\s*(0\d{1,2}|\d{1,2})\b/i)
  const cone      = coneMatch ? coneMatch[1] : null

  // Ambient: only if the text actually states a starting temperature.
  let ambientC = DEFAULT_AMBIENT_C
  const ambientMatch = raw.match(/\b(?:start(?:ing)?|from|ambient|room)\s*(?:temp(?:erature)?)?\s*(?:of|at|:)?\s*(\d{1,4})\s*°?\s*[cf]?/i)
  if (ambientMatch) {
    const v = Number(ambientMatch[1])
    if (v >= 0 && v <= 200) ambientC = Math.round(unit === 'F' ? fToC(v) : v)
  }

  const segments = []

  for (const line of raw.split('\n')) {
    const original = line.trim()
    if (!original) continue

    // Strip a leading row label: "Step 1:", "Segment 2)", "3.", "#4", "Ramp 5 -"
    let work = original.replace(/^\s*(?:#|step|segment|seg|ramp)?\s*\d{1,2}\s*[:.)\-|]\s*/i, '')
                       .replace(/^\s*(?:#|step|segment|seg|ramp)\s*[:.)\-|]?\s*/i, '')

    // A header row ("Ramp | Rate °F/hr | Target | Hold") has words but no
    // meaningful numbers — drop it without complaint.
    const digitsOnly = work.replace(/[^\d]/g, '')
    if (HEADER.test(work) && digitsOnly.length <= 1 && !RATE_WORD.test(work)) continue
    if (/\btotal\b/i.test(work)) continue

    // 1. HOLD — pull it out first so its number can't be mistaken for a target.
    // Two shapes: the controller's "HLd2 1.00" (segment index, then value) and
    // everything else's "hold for 60 minutes".
    let hold = 0
    const holdRe = /\b(?:hold|soak|dwell)(?:ing)?\s*(?:for|of|at)?\s*[:=]?\s*(\d+(?:[:.]\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)?/i
    const hldRe  = /\bhld\s*\d?\s*[:=]?\s*(\d+(?:[:.]\d+)?)/i
    const holdM  = work.match(hldRe) || work.match(holdRe)
    if (holdM) {
      hold = parseHold(holdM[1], holdM[2])
      work = work.replace(holdM[0], ' ')
    }

    // 2. A trailing h:mm is Glazy's DERIVED time column, not data — drop it.
    work = work.replace(/\b\d{1,2}:\d{2}\b\s*$/, ' ')

    // 3. Controller shorthand: rA1 300 °F1 240 HLd1 60
    const ctrl = work.match(/\bra\s*\d*\s*[:=]?\s*(\d+|afap|full)\b[\s\S]*?°?\s*[cf]?\s*\d*\s*[:=]?\s*(\d{2,4})\b/i)
    const isCtrl = /\bra\s*\d/i.test(work) && /\bhld\s*\d/i.test(original)
    if (isCtrl && ctrl) {
      pushSegment(ctrl[1], ctrl[2], hold)
      continue
    }

    // 4. Duration form: "2 hours to 600°C" / "over 90 min to 1100"
    const dur = work.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b[^\d]{0,12}?(?:to|→|->)\s*(\d{2,4})/i)
    if (dur && !/\/\s*(?:hr|hour|h)/i.test(work)) {
      const mins = /^h/i.test(dur[2]) ? Number(dur[1]) * 60 : Number(dur[1])
      const targetC = toC(Number(dur[3]))
      segments.push({ rate: null, durationMins: Math.max(1, Math.round(mins)), target: targetC, hold })
      continue
    }

    // 5. Prose/arrow form: "<rate> to <target>"
    const arrow = work.match(/(afap|full|max(?:imum)?|\d+(?:\.\d+)?)\s*(?:°\s*[cf])?\s*(?:\/\s*(?:hr|hour|h)|\s*(?:per|an|a)\s*(?:hr|hour))?\s*(?:°\s*[cf])?[^\d]{0,14}?(?:to|→|->|up\s*to|down\s*to)\s*(\d{2,4})/i)
    if (arrow) {
      pushSegment(arrow[1], arrow[2], hold)
      continue
    }

    // 6. Bare numeric row: [index] rate target [hold]
    const tokens = work.match(/afap|full|\d+(?:\.\d+)?/gi) || []
    if (tokens.length >= 2) {
      let t = tokens.slice()
      // Leading sequential index — "1  150  250  0". Only drop it when doing so
      // still leaves a plausible row, so a genuine "9 1200" survives.
      if (t.length >= 3 && Number(t[0]) === segments.length + 1 && Number(t[0]) < 40) t = t.slice(1)
      const [rateTok, targetTok, holdTok] = t
      if (holdTok !== undefined && !holdM) hold = parseHold(holdTok)
      pushSegment(rateTok, targetTok, hold)
      continue
    }

    // 7. A hold on its own line belongs to the segment above it.
    if (holdM && segments.length) {
      segments[segments.length - 1].hold += hold
      continue
    }

    // Only complain about lines that LOOK like a step (two or more numbers).
    // A title line — "Cone 6 glaze, Skutt" — is metadata, not a failure.
    if ((work.match(/\d+/g) || []).length >= 2) skipped.push(original)
  }

  function toC(v) {
    return Math.round(unit === 'F' ? fToC(v) : v)
  }

  function pushSegment(rateTok, targetTok, hold) {
    const target = Number(targetTok)
    if (!Number.isFinite(target)) return
    let rate
    if (RATE_WORD.test(String(rateTok))) {
      rate = FULL_RATE
    } else {
      const r = Math.abs(Number(rateTok))          // "-100/hr" for cooling → 100
      if (!Number.isFinite(r) || r === 0) return
      rate = r >= FULL_RATE ? FULL_RATE : Math.round(unit === 'F' ? fRateToC(r) : r)
    }
    segments.push({ rate, target: toC(target), hold: Math.max(0, hold) })
  }

  // Duration-form segments need the running temperature to become a rate, so
  // they're resolved here rather than inline.
  let running = ambientC
  for (const seg of segments) {
    if (seg.rate === null) {
      const delta = Math.abs(seg.target - running)
      seg.rate = seg.durationMins > 0 ? Math.max(1, Math.round(delta / seg.durationMins * 60)) : FULL_RATE
      delete seg.durationMins
    }
    running = seg.target
  }

  // A first segment at or below ambient can't ramp anywhere (and real
  // controllers reject it outright). Lower ambient to make it fireable.
  if (segments.length && segments[0].target <= ambientC) {
    ambientC = Math.max(0, segments[0].target - 20)
    warnings.push(`First step targets ${segments[0].target}°C, so the start temperature was lowered to ${ambientC}°C.`)
  }

  if (guessed && segments.length) {
    warnings.push(`No °C or °F in the text — read as ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}. Check the temperatures below.`)
  }
  if (skipped.length) {
    warnings.push(`${skipped.length} line${skipped.length === 1 ? '' : 's'} couldn't be read and ${skipped.length === 1 ? 'was' : 'were'} skipped.`)
  }

  const points = segments.length ? segmentsToPoints(ambientC, segments, 0) : []

  // Type: keywords first, then peak temperature. Cone 06 bisque peaks ~1000°C.
  const lower = raw.toLowerCase()
  let type = null
  if (segments.length) {
    if (/\braku\b/.test(lower)) type = 'raku'
    else if (/\bbisque|biscuit\b/.test(lower)) type = 'bisque'
    else if (/\bglaze\b/.test(lower)) type = 'glaze'
    else {
      const peak = Math.max(...segments.map(s => s.target))
      type = peak < 1100 ? 'bisque' : 'glaze'
    }
  }

  return { segments, points, unit, unitGuessed: guessed, ambientC, cone, type, warnings, skipped }
}

export const PASTE_EXAMPLE = `Step 1: 80°F/hr to 250°F, hold 60 min
Step 2: 200°F/hr to 1000°F
Step 3: 150°F/hr to 2185°F, hold 15 min
Step 4: 300°F/hr to 1900°F, hold 30 min`

export function useSchedulePaste() {
  return { parseSchedule, detectUnit, parseHold, PASTE_EXAMPLE }
}