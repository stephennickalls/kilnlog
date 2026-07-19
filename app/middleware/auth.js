// app/middleware/auth.js
//
// PACKAGE 7 (G8) — client-side access check mirrors the server's past_due
// grace window (see hasAccess in server/utils/useServerUser.js).
// PAST_DUE_GRACE_DAYS must match the server constant.
//
// PERF REFACTOR (Jul 2026): the profiles fetch used to run on EVERY route
// navigation, blocking each page behind a browser→Supabase round trip. The
// result is now cached in useState for the lifetime of the SPA session — one
// fetch on the first guarded navigation, instant thereafter. The server is
// the real gate (routes 402 when access lapses), so a stale "ok" here can
// never leak data; it can only briefly show a shell whose API calls fail,
// exactly as before. Sign-out clears state by full navigation.
//
// BETA-TEMP: during beta recruitment, lapsed/expired users are sent to
// /register-interest instead of /subscribe. /subscribe itself still exists
// and self-redirects (see subscribe.vue), so it stays in publicRoutes to
// avoid an auth bounce. Grep "BETA-TEMP" to revert.
const PAST_DUE_GRACE_DAYS = 7

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const supabase = useSupabaseClient()
  // BETA-TEMP: added '/register-interest'
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/subscribe', '/register-interest', '/confirm']
  const isPublic = publicRoutes.some(r => to.path.startsWith(r))

  const { data: { session } } = await supabase.auth.getSession()   // local, no network

  if (!session) return isPublic ? undefined : navigateTo('/login')
  if (to.path === '/login' || to.path === '/signup') return navigateTo('/app')
  if (isPublic || to.path === '/account') return

  // Cached access verdict: { userId, ok } — refetch only if user changed.
  const access = useState('access-check', () => null)
  if (access.value?.userId === session.user.id) {
    return access.value.ok ? undefined : navigateTo('/register-interest')  // BETA-TEMP (was /subscribe)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, subscription_ends_at, last_stripe_event_at')
    .eq('id', session.user.id)
    .single()

  if (!profile) return  // server will still gate; don't trap the user here

  const now = new Date()
  const inPastDueGrace =
    profile.subscription_status === 'past_due' &&
    (!profile.last_stripe_event_at ||
      new Date(new Date(profile.last_stripe_event_at).getTime() + PAST_DUE_GRACE_DAYS * 86400000) > now)

  const ok =
    profile.subscription_status === 'active' ||
    (profile.subscription_status === 'trialing' && profile.trial_ends_at && new Date(profile.trial_ends_at) > now) ||
    (profile.subscription_status === 'canceled' && profile.subscription_ends_at && new Date(profile.subscription_ends_at) > now) ||
    inPastDueGrace

  access.value = { userId: session.user.id, ok }

  if (!ok) return navigateTo('/register-interest')  // BETA-TEMP (was /subscribe)
})