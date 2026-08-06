// File: app/composables/useAnalytics.js
//
// Thin wrapper so components never touch window.gtag directly. Safe to call
// anywhere: no-ops on the server and when GA is disabled.
//
// Usage: const { track } = useAnalytics()
//        track('firing_started', { schedule_id: id })

export function useAnalytics() {
  function track(event, params = {}) {
    if (import.meta.server || typeof window.gtag !== 'function') return
    window.gtag('event', event, params)
  }
  return { track }
}