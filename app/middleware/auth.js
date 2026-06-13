// app/middleware/auth.js
//
// PACKAGE 7 (G8) — client-side access check now mirrors the server's
// past_due grace window (see hasAccess in server/utils/useServerUser.js).
// Without this the UI would bounce a past_due-but-in-grace user to /subscribe
// even though the server still serves their data. PAST_DUE_GRACE_DAYS must
// match the server constant.
const PAST_DUE_GRACE_DAYS = 7

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const supabase = useSupabaseClient()
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/subscribe', '/confirm']
  const isPublic = publicRoutes.some(r => to.path.startsWith(r))

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return isPublic ? undefined : navigateTo('/login')
  if (to.path === '/login' || to.path === '/signup') return navigateTo('/app')
  if (isPublic || to.path === '/account') return

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

  if (!ok) return navigateTo('/subscribe')
})