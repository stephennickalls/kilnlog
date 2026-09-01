// File: app/composables/useScheduleSections.js
//
// TWO THINGS THAT MUST AGREE: the list of clay bodies a schedule can be tagged
// with, and the sections the library is browsed by. They live together because
// adding a body without adding its section makes those schedules vanish into
// the catch-all, and adding a section without the body makes an empty group.
//
// SECTIONS ARE NOT `type`. Type (bisque | glaze | raku | single_fire | other)
// answers "what kind of firing is this" and was fine at six presets. At twenty
// it puts fifteen rows under "glaze" and the list stops helping. A potter
// picking a plan is answering "what am I firing?", which is body AND firing
// type together: a bisque is a bisque whatever the clay, but once you are past
// bisque the body is the whole question.
//
// ORDER IS TEMPERATURE, low to high, with bisque first because it comes first
// in the process. Alphabetical would give Earthenware, Midfire, Porcelain,
// Stoneware — a coincidence that reads as deliberate and breaks the moment
// somebody adds Terracotta.

// Must match the schedule_library_body_check constraint
// (migrations/20260902_body_presets.sql). NULL is a valid stored value and
// means "any body"; it is offered in the picker as the empty option.
export const CLAY_BODIES = [
  { value: 'earthenware', label: 'Earthenware' },
  { value: 'midfire',     label: 'Midfire stoneware' },
  { value: 'stoneware',   label: 'Stoneware' },
  { value: 'porcelain',   label: 'Porcelain' },
]

export function labelForBody(body) {
  return CLAY_BODIES.find(b => b.value === body)?.label ?? 'Any body'
}

const SECTIONS = [
  { key: 'bisque',      label: 'Bisque',      match: s => s.type === 'bisque' },
  { key: 'earthenware', label: 'Earthenware', match: s => s.body === 'earthenware' },
  { key: 'midfire',     label: 'Midfire',     match: s => s.body === 'midfire' },
  { key: 'stoneware',   label: 'Stoneware',   match: s => s.body === 'stoneware' },
  { key: 'porcelain',   label: 'Porcelain',   match: s => s.body === 'porcelain' },
  { key: 'raku',        label: 'Raku',        match: s => s.type === 'raku' },
  { key: 'other',       label: 'Any body',    match: () => true },
]

export function useScheduleSections() {
  // Returns [{ key, label, schedules }] with empty sections dropped. FIRST
  // MATCH WINS, so a schedule appears exactly once, and the 'other' catch-all
  // is last and matches everything remaining — which is why nothing can fall
  // through the list and silently vanish.
  function sectionsFor(schedules) {
    const list = schedules ?? []
    const taken = new Set()
    const out = []

    for (const section of SECTIONS) {
      const hits = list.filter(s => !taken.has(s.id) && section.match(s))
      if (!hits.length) continue
      hits.forEach(s => taken.add(s.id))
      out.push({ key: section.key, label: section.label, schedules: hits })
    }
    return out
  }

  return { sectionsFor, CLAY_BODIES, labelForBody }
}