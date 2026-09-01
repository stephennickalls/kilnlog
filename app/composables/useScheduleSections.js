// File: app/composables/useScheduleSections.js
//
// TWO LEVELS, NOT ONE. Stage outside (Bisque, Glaze, Raku), clay body inside.
// The old version was a flat first-match-wins list where 'bisque' matched
// before any body could, so a bisque schedule could never show its body and a
// glaze schedule could never show its stage. A potter picking a plan answers
// two questions in that order: which firing is this, and what clay is in it.
//
// THREE BODIES, NOT FOUR. 'midfire' used to sit in this list beside
// 'stoneware', which put a temperature range in a list of materials and is the
// reason none of the groups made sense. Midfire stoneware is stoneware; the
// `cone` column already carries how hot. This list must match the
// schedule_library_body_check constraint in
// migrations/20260903_schedule_body_and_fuel.sql and BODIES in
// server/api/schedules/index.post.js and [id].put.js.
//
// NULL body is a real answer meaning "any clay". A cone 06 bisque, a raku and
// the thick-work schedule genuinely apply to every body, and forcing a tag on
// them would file them somewhere nobody would look.

export const CLAY_BODIES = [
  { value: 'earthenware', label: 'Earthenware' },
  { value: 'stoneware',   label: 'Stoneware' },
  { value: 'porcelain',   label: 'Porcelain' },
]

export function labelForBody(body) {
  return CLAY_BODIES.find(b => b.value === body)?.label ?? 'Any body'
}

// Outer level, in process order. 'other' is the catch-all and is last, so a
// schedule with an unrecognised type cannot fall through and vanish.
const STAGES = [
  { key: 'bisque',      label: 'Bisque',      match: s => s.type === 'bisque' },
  { key: 'glaze',       label: 'Glaze',       match: s => s.type === 'glaze' },
  { key: 'single_fire', label: 'Single fire', match: s => s.type === 'single_fire' },
  { key: 'raku',        label: 'Raku',        match: s => s.type === 'raku' },
  { key: 'other',       label: 'Other',       match: () => true },
]

// Inner level, low to high, with "Any body" last: it is the group you read
// when the first three did not describe your clay.
const BODY_GROUPS = [
  { key: 'earthenware', label: 'Earthenware', match: s => s.body === 'earthenware' },
  { key: 'stoneware',   label: 'Stoneware',   match: s => s.body === 'stoneware' },
  { key: 'porcelain',   label: 'Porcelain',   match: s => s.body === 'porcelain' },
  { key: 'any',         label: 'Any body',    match: () => true },
]

// Sort within a body group by peak temperature, so cone 04 sits above cone 6
// sits above cone 10 without needing the cones table in here. Accepts both the
// db shape (target_temp) and the editor shape (targetTemp).
function peakOf(s) {
  const pts = s.points ?? []
  if (!pts.length) return 0
  return Math.max(...pts.map(p => p.target_temp ?? p.targetTemp ?? 0))
}

export function useScheduleSections() {
  // Returns [{ key, label, count, groups: [{ key, label, schedules }] }].
  // Empty stages and empty body groups are dropped. A schedule appears exactly
  // once: claimed at the stage level, then claimed again within it.
  function sectionsFor(schedules) {
    const list = schedules ?? []
    const takenStage = new Set()
    const out = []

    for (const stage of STAGES) {
      const inStage = list.filter(s => !takenStage.has(s.id) && stage.match(s))
      if (!inStage.length) continue
      inStage.forEach(s => takenStage.add(s.id))

      const takenBody = new Set()
      const groups = []

      for (const group of BODY_GROUPS) {
        const hits = inStage.filter(s => !takenBody.has(s.id) && group.match(s))
        if (!hits.length) continue
        hits.forEach(s => takenBody.add(s.id))
        groups.push({
          key: group.key,
          label: group.label,
          schedules: hits.sort((a, b) => peakOf(a) - peakOf(b)),
        })
      }

      out.push({ key: stage.key, label: stage.label, count: inStage.length, groups })
    }
    return out
  }

  // One flat level, for any caller with no room to nest. A stage with a single
  // body group keeps its plain name; only a split stage gets a compound label.
  function flatSectionsFor(schedules) {
    return sectionsFor(schedules).flatMap(stage =>
      stage.groups.map(g => ({
        key: `${stage.key}:${g.key}`,
        label: stage.groups.length > 1 ? `${stage.label}: ${g.label}` : stage.label,
        schedules: g.schedules,
      }))
    )
  }

  return { sectionsFor, flatSectionsFor, CLAY_BODIES, labelForBody }
}