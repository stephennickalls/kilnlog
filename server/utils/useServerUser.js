// File: server/utils/useServerUser.js
//
// PACKAGE 1 REFACTOR — RLS becomes real.
//
// Previously this returned a SERVICE-ROLE client, which bypasses RLS entirely
// and made every route responsible for manually filtering by user_id (and
// several didn't — schedules/library leaked all users' data).
//
// Now `db` is a USER-SCOPED client: publishable key + the caller's own JWT in
// the Authorization header. Every query through it is evaluated by Postgres
// RLS as that user. Routes keep their explicit .eq('user_id', ...) filters as
// defence-in-depth, but a missing filter can no longer leak another user's
// rows.
//
// Needs service role instead? Use serviceClient() (server/utils/serviceClient.js)
// and justify it in a comment at the call site. Current legitimate users:
// stripe webhook, logs read/write, logger/serverError persistence, and the
// checkout route's stripe_customer_id write.
//
// Return shape is unchanged: { db, user, profile }.

import { createClient } from '@supabase/supabase-js'

export async function useServerUser(event, { requireSubscription = true } = {}) {
  const config = useRuntimeConfig()
  const url            = config.public.supabaseUrl
  const publishableKey = config.public.supabasePublishableKey
  if (!url || !publishableKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase env vars not set' })
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  // User-scoped client: all PostgREST queries carry the user's JWT, so RLS
  // applies. No session persistence — this is a per-request server context.
  const db = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { persistSession: false, autoRefreshToken: false },
  })

  // Validates signature + expiry against Supabase Auth.
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid session' })

  // Reads the caller's own row under profiles_select_own RLS.
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('subscription_status, trial_ends_at, subscription_ends_at, stripe_customer_id, role')
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