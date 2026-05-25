// app/plugins/auth-fetch.client.js
//
// Injects the Supabase Bearer token into every $fetch call.
// Caches the token in memory and only calls getSession() when:
//   1. We have no token yet, or
//   2. The token expires within the next 60 seconds
// This eliminates a Supabase round trip on every single API call.

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

  let cachedToken   = null
  let cachedExpiry  = 0  // unix seconds

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
    onRequest: async ({ options }) => {
      const token = await getToken()
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        }
      }
    },
  })
})