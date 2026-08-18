// app/composables/useCones.js
//
// ONE cones fetch, shared. ConeSelect, ConePackEditor and both schedule
// editors all need the same reference list; before this each hit /api/cones
// independently, so opening the schedule editor fired three identical
// requests and any one of them failing left that control blank while the
// others worked.
//
// Module-level cache plus an in-flight promise, so concurrent callers await
// the same request. Cones are reference data that changes approximately
// never, so there is no TTL and no invalidation.
//
// The name → temperature lookup is what lets the schedule editors turn "cone
// 6" into a peak temperature. If a cone has no temp_c the lookup returns null
// rather than a guess — the caller falls back to a type default, because a
// wrong peak is worse than a generic one.

const cones   = ref([])     // [{ id, name, temp_c, sort_order }]
const loaded  = ref(false)
let   inflight = null

function load() {
  if (loaded.value) return Promise.resolve(cones.value)
  if (!inflight) {
    inflight = $fetch('/api/cones')
      .then((rows) => {
        cones.value  = Array.isArray(rows) ? rows : []
        loaded.value = true
        return cones.value
      })
      .catch(() => {
        // A missing cones list must never block the page. Callers degrade to
        // type defaults; ConeSelect shows an empty list.
        cones.value = []
        return cones.value
      })
      .finally(() => { inflight = null })
  }
  return inflight
}

export function useCones() {
  if (import.meta.client && !loaded.value) load()

  // Cold to hot. Cones without a rating keep their sort_order position rather
  // than being dropped — a gap in reference data must not hide a cone.
  const byTemp = computed(() =>
    [...cones.value]
      .map((c, i) => ({
        name:  c.name,
        tempC: Number.isFinite(Number(c.temp_c)) ? Number(c.temp_c) : null,
        order: Number.isFinite(Number(c.sort_order)) ? Number(c.sort_order) : i,
      }))
      .sort((a, b) => {
        if (a.tempC !== null && b.tempC !== null) return a.tempC - b.tempC
        return a.order - b.order
      })
  )

  // °C for a cone name, or null if unknown / unrated.
  function tempFor(name) {
    if (!name) return null
    const c = cones.value.find(x => x.name === name)
    const t = Number(c?.temp_c)
    return Number.isFinite(t) ? t : null
  }

  // The cone a temperature lands on, within `tolerance` degrees. Used to label
  // a peak the user typed by hand.
  function nameFor(tempC, tolerance = 3) {
    if (!Number.isFinite(Number(tempC))) return null
    return byTemp.value.find(c => c.tempC !== null && Math.abs(c.tempC - tempC) <= tolerance)?.name ?? null
  }

  // Guide / target / guard around a cone, for seeding a cone pack.
  function neighbours(name) {
    const i = byTemp.value.findIndex(c => c.name === name)
    if (i === -1) return []
    return [byTemp.value[i - 1], byTemp.value[i], byTemp.value[i + 1]].filter(Boolean).map(c => c.name)
  }

  return { cones, loaded, load, byTemp, tempFor, nameFor, neighbours }
}