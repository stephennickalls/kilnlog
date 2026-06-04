// app/composables/useClientLog.js
// Reports a client-side error to the server logs table. Fire-and-forget and
// completely safe: it never throws and never blocks your code path. Use it in
// catch blocks instead of an empty {} so failures become visible in /logs.
//
// Usage:
//   const { report } = useClientLog()
//   try { ... } catch (e) { report('sensor.flash.failed', e, { step }) }

export function useClientLog() {
  const supabase = useSupabaseClient()

  async function report(event, err, context = {}) {
    // Always echo to the browser console so it's visible in devtools live.
    // (This is the part that helps during a hands-on firing.)
    console.error(`[${event}]`, err, context)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return  // not logged in — console line is the record

      await $fetch('/api/logs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          level:   'error',
          event,
          message: err?.message ?? String(err),
          context: {
            ...context,
            ...(err?.stack ? { stack: err.stack } : {}),
            url: typeof window !== 'undefined' ? window.location.pathname : undefined,
          },
        },
      })
    } catch {
      // Swallow — logging must never break the caller. Console line above stands.
    }
  }

  return { report }
}