// File: app/middleware/auth.js
//
// PACKAGE 7 (G8) history: this file used to mirror the server's past_due
// grace window client-side.
//
// ARCH/PERF (Aug 2026): the client-side profiles fetch is GONE. The server is
// the only access gate — every /app API route runs through useServerUser,
// which 402s when access lapses; app.vue catches the 402 from /api/bootstrap
// and redirects. Deleting the browser→Supabase query removes its CORS
// preflight, its supabase-js auth-lock queuing (the post-login waterfall),
// and the hand-synced duplicate of PAST_DUE_GRACE_DAYS/hasAccess.
// This middleware is now session-only and fully local — zero network.
//
// BETA-TEMP: during beta recruitment, lapsed/expired users land on
// /register-interest (redirect lives in app.vue's 402 handler). /subscribe
// still exists and self-redirects, so it stays in publicRoutes to avoid an
// auth bounce. Grep "BETA-TEMP" to revert.

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const supabase = useSupabaseClient()
  // BETA-TEMP: added '/register-interest'
  // app/middleware/auth.js — replace in publicRoutes:
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/subscribe', '/early-access', '/confirm']
  const isPublic = publicRoutes.some(r => to.path.startsWith(r))

  const { data: { session } } = await supabase.auth.getSession()   // local, no network

  if (!session) return isPublic ? undefined : navigateTo('/login')
  if (to.path === '/login' || to.path === '/signup') return navigateTo('/app')
})