// app/middleware/auth.js
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
    .select('subscription_status, trial_ends_at, subscription_ends_at')
    .eq('id', session.user.id)
    .single()

  if (!profile) return  // server will still gate; don't trap the user here

  const now = new Date()
  const ok =
    profile.subscription_status === 'active' ||
    (profile.subscription_status === 'trialing' && profile.trial_ends_at && new Date(profile.trial_ends_at) > now) ||
    (profile.subscription_status === 'canceled' && profile.subscription_ends_at && new Date(profile.subscription_ends_at) > now)

  if (!ok) return navigateTo('/subscribe')
})



