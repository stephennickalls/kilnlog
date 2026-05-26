// app/composables/useAutoEndNotices.js
// Tracks which auto-ended firing notices the user has dismissed.
// Stored in localStorage so dismissals survive page refreshes.

const STORAGE_KEY = 'kilnlog:dismissed_auto_end'

function getDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveDismissed(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function useAutoEndNotices() {
  // Returns firing IDs that were auto-ended and haven't been dismissed
  function pendingNotices(firings) {
    const dismissed = getDismissed()
    return (firings ?? []).filter(
      f => f.auto_ended && f.ended_at && !dismissed.has(f.id)
    )
  }

  function dismiss(firingId) {
    const dismissed = getDismissed()
    dismissed.add(firingId)
    saveDismissed(dismissed)
  }

  function isDismissed(firingId) {
    return getDismissed().has(firingId)
  }

  return { pendingNotices, dismiss, isDismissed }
}