// File: app/composables/useActiveFiring.js
//
// G5 — one firing at a time. Pages outside /app (the schedule library and the
// schedule editor) need to know whether a firing is currently running so they
// can disable their "Start firing" / "Save & start" affordances. This wraps the
// one definition of "active" (started, not ended) and the fetch, so each page
// doesn't re-implement it.
//
// Usage:
//   const { activeFiring, loadActiveFiring } = useActiveFiring()
//   onMounted(loadActiveFiring)
//   ... :start-disabled="!!activeFiring"
//
// Not a singleton on purpose — each page gets its own snapshot fetched on
// mount. The server's partial unique index remains the real enforcement; this
// is purely to keep the UI honest and avoid a doomed navigation.

export function useActiveFiring() {
  const activeFiring = ref(null)
  const loading = ref(false)

  async function loadActiveFiring() {
    loading.value = true
    try {
      const firings = await $fetch('/api/firings')
      activeFiring.value = (firings ?? []).find(f => f.started_at && !f.ended_at) ?? null
    } catch {
      // On failure, leave activeFiring null — the server still blocks a second
      // firing with a 409, so we fail open on the UI guard rather than trap the
      // user out of starting anything.
      activeFiring.value = null
    } finally {
      loading.value = false
    }
  }

  return { activeFiring, loading, loadActiveFiring }
}