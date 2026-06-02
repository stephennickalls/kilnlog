// server/utils/useServerUser.js
import { createClient } from '@supabase/supabase-js'

export async function useServerUser(event, { requireSubscription = true } = {}) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw createError({ statusCode: 500, statusMessage: 'Supabase env vars not set' })

  const db = createClient(url, key)

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid session' })

  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('subscription_status, trial_ends_at, subscription_ends_at')
    .eq('id', user.id)
    .single()

  if (profErr || !profile) {
    throw createError({ statusCode: 403, statusMessage: 'No profile found' })
  }

  if (requireSubscription && !hasAccess(profile)) {
    throw createError({ statusCode: 402, statusMessage: 'Subscription required' })
  }

  return { db, user, profile }
}

export function hasAccess(profile) {
  const now = new Date()
  if (profile.subscription_status === 'active') return true
  if (
    profile.subscription_status === 'trialing' &&
    profile.trial_ends_at &&
    new Date(profile.trial_ends_at) > now
  ) return true
  if (
    profile.subscription_status === 'canceled' &&
    profile.subscription_ends_at &&
    new Date(profile.subscription_ends_at) > now
  ) return true
  return false
}