// app/plugins/auth-fetch.client.js
//
// Injects the Supabase Bearer token into every $fetch call and self-heals 401s.
//
// HOW THE INTERCEPT WORKS (Jul 2026 fix): components use Nuxt's auto-imported
// $fetch, which is bound at BUILD time — so the old `globalThis.$fetch = ...`
// patch alone was never in the call path, and every /api/* request went out
// with no Authorization header (the beta 401 bug). The named `$fetch` export
// at the bottom of this file is now the auto-import target (see the imports
// override in nuxt.config.ts); it delegates lazily to globalThis.$fetch,
// which this plugin patches before any component code runs.
//
// SELF-HEALING: any 401 clears the token cache, forces ONE deduped session
// refresh, retries the request once with the fresh token, and hard-redirects
// to /login if there is genuinely no session. Retrying on 401 is safe for
// mutations: the server rejected auth before doing any work.

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

  let cachedToken  = null
  let cachedExpiry = 0     // unix seconds
  let refreshing   = null  // in-flight forced refresh (dedupe)

  async function getToken() {
    const now = Math.floor(Date.now() / 1000)

    // Return cached token if it's still valid for more than 60 seconds
    if (cachedToken && cachedExpiry - now > 60) return cachedToken

    // Fetch a fresh session — this will auto-refresh if needed
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) console.warn('[auth-fetch] getSession failed:', error.message)

    if (!session?.access_token) {
      cachedToken  = null
      cachedExpiry = 0
      return null
    }

    cachedToken  = session.access_token
    cachedExpiry = session.expires_at  // unix seconds, provided by Supabase
    return cachedToken
  }

  // One forced refresh at a time — a burst of parallel 401s (bootstrap +
  // preferences + firings) must not fire competing refresh calls.
  function forceRefresh() {
    if (!refreshing) {
      refreshing = supabase.auth
        .refreshSession()
        .catch(err => ({ data: { session: null }, error: err }))
        .finally(() => { refreshing = null })
    }
    return refreshing
  }

  // Keep cache in sync when Supabase refreshes the token in the background
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      cachedToken  = session.access_token
      cachedExpiry = session.expires_at
    } else {
      cachedToken  = null
      cachedExpiry = 0
    }
  })

  globalThis.$fetch = $fetch.create({
    // Retry exactly once, only on 401. onResponseError below runs first and
    // swaps in a fresh token; the retry re-runs onRequest and attaches it.
    retry: 1,
    retryStatusCodes: [401],

    onRequest: async ({ options }) => {
      const token = await getToken()
      if (token) {
        // Headers-safe merge — spreading a Headers instance yields {}.
        const h = new Headers(options.headers)
        h.set('Authorization', `Bearer ${token}`)
        options.headers = h
      }
    },

    onResponseError: async ({ response }) => {
      if (response?.status !== 401) return

      // The token the server just rejected is worthless — drop it.
      cachedToken  = null
      cachedExpiry = 0

      const { data, error } = await forceRefresh()
      if (data?.session?.access_token) {
        cachedToken  = data.session.access_token
        cachedExpiry = data.session.expires_at
        return  // ofetch retries; onRequest attaches the fresh token
      }

      // No recoverable session. Full-reload to /login resets everything
      // (plugin cache, useState, component state). Skip on public pages.
      if (error) console.warn('Session refresh failed after 401:', error)
      const path = window.location.pathname
      const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/register-interest', '/confirm', '/subscribe']
      if (!publicPaths.some(p => path.startsWith(p))) {
        window.location.href = '/login'
      }
    },
  })
})

// ── Auto-import target ───────────────────────────────────────────────────────
// nuxt.config.ts routes the `$fetch` auto-import here. Lazy delegation:
// globalThis.$fetch is the patched instance by the time any component calls it.
const delegatingFetch = (...args) => globalThis.$fetch(...args)
delegatingFetch.raw    = (...args) => globalThis.$fetch.raw(...args)
delegatingFetch.native = (...args) => globalThis.$fetch.native(...args)
delegatingFetch.create = (...args) => globalThis.$fetch.create(...args)
export { delegatingFetch as $fetch }