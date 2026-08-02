// app/plugins/error-capture.client.js
//
// CLIENT ERROR CAPTURE (Aug 2026): the /api/logs POST ingest existed but
// nothing called it — browser errors were invisible unless a tester reported
// them, which beta testers don't. This plugin ships every uncaught problem to
// the logs table:
//   - Vue render/lifecycle errors  (nuxtApp vue:error hook)
//   - uncaught window errors       (window 'error')
//   - unhandled promise rejections (window 'unhandledrejection')
//
// Safety rails: per-session cap + short dedupe window so an error loop can't
// hammer the API (the server also rate-limits per user), and the reporter
// itself can never throw. Uses the patched global $fetch, so the Bearer token
// is attached automatically; unauthenticated visitors' errors are skipped
// (the ingest requires a session — acceptable: signed-in testers are who we
// are watching).

export default defineNuxtPlugin((nuxtApp) => {
  const MAX_PER_SESSION = 25
  const DEDUPE_MS = 10_000

  let sent = 0
  const recent = new Map()   // message -> last sent ts

  function shouldSend(message) {
    if (sent >= MAX_PER_SESSION) return false
    const now = Date.now()
    const last = recent.get(message) ?? 0
    if (now - last < DEDUPE_MS) return false
    recent.set(message, now)
    if (recent.size > 50) recent.clear()
    return true
  }

  function report(evt, message, context = {}) {
    try {
      const msg = String(message ?? 'Unknown error').slice(0, 500)
      if (!shouldSend(`${evt}:${msg}`)) return
      sent++
      globalThis.$fetch('/api/logs', {
        method: 'POST',
        body: {
          level: 'error',
          event: evt,
          message: msg,
          context: {
            ...context,
            path: window.location.pathname,
            ua: navigator.userAgent.slice(0, 200),
          },
        },
        // Failures here must be silent — no retry storm, no console spam loop.
        retry: 0,
      }).catch(() => {})
    } catch { /* never throw from the reporter */ }
  }

  // Vue errors (render, lifecycle, handlers)
  nuxtApp.hook('vue:error', (err, _instance, info) => {
    report('client.vue_error', err?.message ?? err, {
      info,
      stack: err?.stack?.slice(0, 2000) ?? null,
    })
  })

  // Uncaught window errors
  window.addEventListener('error', (e) => {
    report('client.uncaught', e.message, {
      file: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : null,
      stack: e.error?.stack?.slice(0, 2000) ?? null,
    })
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    report('client.unhandled_rejection', r?.message ?? String(r), {
      stack: r?.stack?.slice(0, 2000) ?? null,
      status: r?.status ?? r?.statusCode ?? null,
    })
  })
})