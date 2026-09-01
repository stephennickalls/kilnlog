// File: app/composables/useFiringZones.js
//
// Reference temperature zones drawn behind the chart ("key events overlay"),
// AND the landmark temperatures the starter curves slow down over. Those two
// have to be the same numbers or the app contradicts itself on screen: a band
// labelled "ease through here" with a generated curve sailing straight through
// it is worse than no band at all. useStarterCurve imports them from here.
//
// WHY CONSTANTS AND NOT A TABLE: they are physics, not user data and not
// configuration. A table would buy tuning by UPDATE, at the cost of a
// migration, an RLS policy, an endpoint and a network round trip on every
// chart. If a number here is wrong, it is a one-line deploy.
//
// TEMPERATURES ARE ALWAYS °C. min is always the LOWER number, even for the
// zones that matter on the way down; `note` carries the direction in words.
//
// RANGES ARE PRACTICE, NOT PHYSICS (Sep 2026). The first version used the
// textbook figures and they were useless: quartz inversion is a knife-edge at
// 573°C, which renders as a 4px sliver, and nobody fires to a knife-edge
// anyway — the whole approach gets eased through. Each zone is now the range a
// potter actually slows down over, which is both more useful and wide enough
// to read.
//
// BODY REDUCTION WAS REMOVED. It sat at 1010-1100 while a tester's own planned
// reduction started at 894 (cone 010), so the app contradicted the user's own
// plan with a number presented as reference. Reduction timing varies by
// tradition and clay body, and reduction_periods already lets people state
// their intent — a fixed band competing with that is worse than none.
//
// TONE is the colour category, deliberately about CONSEQUENCE rather than
// subject: 'crack' is where you lose work, 'glaze' is glaze behaviour,
// 'process' is something happening with nothing at stake.

// The two inversions, as ranges. Exported because the starter curve profiles
// build their slow segments to exactly these edges.
export const QUARTZ_LO = 540
export const QUARTZ_HI = 610
export const CRISTOBALITE_LO = 200
export const CRISTOBALITE_HI = 280

const BISQUE_MAX_C = 1150

const ZONES = {
  bisque: [
    {
      label: 'Water smoking',
      min: 20, max: 120,
      tone: 'process',
      note: 'Free water leaving. Thick work needs this slow or it will burst.',
    },
    {
      label: 'Organic burnout',
      min: 300, max: 800,
      tone: 'process',
      note: 'Carbon and sulphur oxidising out. Starve it of air here and you risk black coring.',
    },
    {
      label: 'Quartz inversion',
      min: QUARTZ_LO, max: QUARTZ_HI,
      tone: 'crack',
      note: 'Silica jumps about 1% in volume at 573°C. Ease through the whole range, and ease through it again on the way down.',
    },
    {
      label: 'Cristobalite inversion',
      min: CRISTOBALITE_LO, max: CRISTOBALITE_HI,
      tone: 'crack',
      note: 'The dunting zone. Cooling fast through here cracks finished work overnight.',
    },
  ],
  glaze: [
    {
      label: 'Quartz inversion',
      min: QUARTZ_LO, max: QUARTZ_HI,
      tone: 'crack',
      note: 'Silica jumps about 1% in volume at 573°C. Ease through the whole range, and ease through it again on the way down.',
    },
    {
      label: 'Glaze seal',
      min: 700, max: 800,
      tone: 'glaze',
      note: 'Glaze goes solid on the way down. Opening the kiln above this crazes.',
    },
    {
      label: 'Cristobalite inversion',
      min: CRISTOBALITE_LO, max: CRISTOBALITE_HI,
      tone: 'crack',
      note: 'The dunting zone. Cooling fast through here cracks finished work overnight.',
    },
  ],
}

export function useFiringZones() {
  // peakC is the highest temperature on either curve. A firing with no plan and
  // no readings yet has no peak, so it falls to bisque — the gentler set, and
  // the one whose low-temperature zones are relevant to a firing that has only
  // just started.
  function zonesForPeak(peakC) {
    const peak = Number(peakC)
    if (!Number.isFinite(peak) || peak <= 0) return ZONES.bisque
    return peak < BISQUE_MAX_C ? ZONES.bisque : ZONES.glaze
  }

  return { zonesForPeak, BISQUE_MAX_C }
}