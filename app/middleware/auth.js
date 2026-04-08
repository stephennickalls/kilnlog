// middleware/auth.js
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()

  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/subscribe', '/confirm']
  const isPublic = publicRoutes.some(r => to.path.startsWith(r))

  // If there's an OAuth token in the URL hash, let it through to be processed
  // This happens when Supabase redirects back after Google OAuth
  if (import.meta.client && window.location.hash.includes('access_token')) {
    // Process the token
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return
    // Give Supabase a moment to process the hash
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in
  if (!user) {
    if (isPublic) return
    return navigateTo('/login')
  }

  // Logged in but on login/signup — send to app
  if (user && (to.path === '/login' || to.path === '/signup')) {
    return navigateTo('/app')
  }

  // Skip subscription check for public routes and account page
  if (isPublic || to.path === '/account') return

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single()

  if (!profile) return

  const now = new Date()
  const isTrial  = profile.subscription_status === 'trialing' && new Date(profile.trial_ends_at) > now
  const isActive = profile.subscription_status === 'active'

  if (!isTrial && !isActive) {
    return navigateTo('/subscribe')
  }
})