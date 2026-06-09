// app/composables/useScheduleTheme.js
//
// Single source of truth for "what colour is this firing type?". Type drives
// colour everywhere — card, sparkline, editor preview, modal — so the user
// parses the library by colour-temperature before reading. Mapping by firing
// CHARACTER (not arbitrary): warm = earthy/oxidation/low-fire, celadon = the
// reduction/glaze result, cobalt = raku's smoke-and-flash drama.
//
//   bisque       → warm    (flame)
//   glaze        → celadon
//   single_fire  → celadon (glaze-result oriented)
//   raku         → cobalt
//   other / ?    → warm    (never colourless, never broken)
//
// Colours are raw hex (sparkline draws to SVG, not Tailwind classes) plus the
// Tailwind class strings the card uses, kept together so they can't drift.

export const FIRING_TYPES = [
  { value: 'bisque',      label: 'Bisque' },
  { value: 'glaze',       label: 'Glaze' },
  { value: 'single_fire', label: 'Single fire' },
  { value: 'raku',        label: 'Raku / specialty' },
  { value: 'other',       label: 'Other' },
]

const THEMES = {
  warm: {
    variant:   'warm',
    stroke:    '#b8551c',                 // flame
    fill:      'rgba(184,85,28,0.07)',
    gridRGBA:  'rgba(168,162,158,0.10)',  // neutral chart-ground lines
    groundBg:  '#fffdf9',
    badgeText: 'text-flame',
    badgeDot:  'bg-flame',
    startBtn:  'text-flame bg-flame-bg hover:bg-flame hover:text-parchment border-flame/20',
  },
  celadon: {
    variant:   'celadon',
    stroke:    '#5f8a78',
    fill:      'rgba(95,138,120,0.10)',
    gridRGBA:  'rgba(95,138,120,0.12)',
    groundBg:  '#eaf1ec',
    badgeText: 'text-celadon-dark',
    badgeDot:  'bg-celadon',
    startBtn:  'text-celadon-dark bg-celadon-bg hover:bg-celadon hover:text-parchment border-celadon/25',
  },
  cobalt: {
    variant:   'cobalt',
    stroke:    '#3a5a78',
    fill:      'rgba(58,90,120,0.09)',
    gridRGBA:  'rgba(58,90,120,0.12)',
    groundBg:  '#eef2f6',
    badgeText: 'text-cobalt-dark',
    badgeDot:  'bg-cobalt',
    startBtn:  'text-cobalt-dark bg-cobalt-bg hover:bg-cobalt hover:text-parchment border-cobalt/25',
  },
}

const TYPE_TO_THEME = {
  bisque:      'warm',
  glaze:       'celadon',
  single_fire: 'celadon',
  raku:        'cobalt',
  other:       'warm',
}

// Resolve a firing type (string) to its theme object. Unknown/empty → warm.
export function themeForType(type) {
  const key = TYPE_TO_THEME[type] ?? 'warm'
  return THEMES[key]
}

export function labelForType(type) {
  return FIRING_TYPES.find(t => t.value === type)?.label ?? 'Custom'
}

export function useScheduleTheme() {
  return { FIRING_TYPES, themeForType, labelForType }
}