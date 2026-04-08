// middleware/auth.js
export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client — avoids SSR race condition where session
  // cookie isn't available yet after OAuth redirect
  if (import.meta.server) return

  const supabase = useSupabaseClient()

  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/subscribe', '/confirm']
  const isPublic = publicRoutes.some(r => to.path.startsWith(r))

  const { data: { session } } = await supabase.auth.getSession()

  // Not logged in
  if (!session) {
    if (isPublic) return
    return navigateTo('/login')
  }

  // Logged in but on login/signup — send to app
  if (to.path === '/login' || to.path === '/signup') {
    return navigateTo('/app')
  }

  // Skip subscription check for public routes and account page
  if (isPublic || to.path === '/account') return

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', session.user.id)
    .single()

  if (!profile) return

  const now      = new Date()
  const isTrial  = profile.subscription_status === 'trialing' && new Date(profile.trial_ends_at) > now
  const isActive = profile.subscription_status === 'active'

  if (!isTrial && !isActive) {
    return navigateTo('/subscribe')
  }
})