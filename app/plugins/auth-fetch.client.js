// plugins/auth-fetch.client.js
//
// Injects the Supabase Bearer token into every $fetch call.
// Uses the existing useSupabaseClient() composable — no new auth system.

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

  globalThis.$fetch = $fetch.create({
    onRequest: async ({ options }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${session.access_token}`,
        }
      }
    },
  })
})