// app/plugins/auth-fetch.client.js
//
// Injects the Supabase Bearer token into every $fetch call.
// Caches the token in memory and only calls getSession() when:
//   1. We have no token yet, or
//   2. The token expires within the next 60 seconds
// This eliminates a Supabase round trip on every single API call.
//
// SELF-HEALING (Jul 2026): a stale cached token used to be a dead end — if the
// access token expired and the silent refresh failed or raced (back-navigation,
// tab sleep, refresh-token rotation from a second device), every /api/* call
// 401'd forever and the app sat "logged in" but broken. Now any 401 response:
//   1. clears the token cache,
//   2. forces ONE session refresh (deduped across concurrent 401s),
//   3. retries the request once with the fresh token (ofetch retry re-runs
//      onRequest, which picks up the new token),
//   4. and if the refresh proves there is genuinely no session, hard-redirects
//      to /login (full page load, so all SPA state resets cleanly).
// Retrying on 401 is safe for mutations: the server rejected auth before doing
// any work, so no side effect can be duplicated.

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

  let cachedToken  = null
  let cachedExpiry = 0     // unix seconds
  let refreshing   = null  // in-flight forced refresh (dedupe)

  async function getToken() {
    const now = Math.floor(Date.now() / 1000)

    // Return cached token if it's still valid for more than 60 seconds
    if (cachedToken && cachedExpiry - now > 60) {
      return cachedToken
    }

    // Fetch a fresh session — this will auto-refresh if needed
    const { data: { session } } = await supabase.auth.getSession()
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
  // preferences + firings) must not fire three competing refresh calls, which
  // is exactly the rotation race that causes this mess in the first place.
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
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        }
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

      // No recoverable session. Don't leave the SPA in half-authed limbo —
      // full-reload to /login resets everything (plugin cache, useState,
      // component state). Skip if we're already on a public auth page.
      if (error) console.warn('Session refresh failed after 401:', error)
      const path = window.location.pathname
      const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/register-interest', '/confirm', '/subscribe']
      if (!publicPaths.some(p => path.startsWith(p))) {
        window.location.href = '/login'
      }
    },
  })
})