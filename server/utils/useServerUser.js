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
//
// PACKAGE 7 (G8) — past_due grace window.
//   A card failure mid-firing used to lock the user out instantly (past_due
//   was simply not in hasAccess). That punishes a paying customer at the worst
//   possible moment. Now past_due keeps FULL access for PAST_DUE_GRACE_DAYS,
//   anchored to last_stripe_event_at — which the webhook stamps on
//   invoice.payment_failed, i.e. the moment the card actually failed.
//   When the customer fixes their card, the invoice.paid webhook flips them
//   back to active immediately; if they never do, access lapses after the
//   window. If past_due somehow has no timestamp, we fail OPEN inside the
//   window's intent (treat as just-failed) rather than locking a payer out on
//   a data gap — Stripe will resolve the real status shortly.

import { createClient } from '@supabase/supabase-js'

// Grace window for a past_due (failed-payment) subscriber. Keep in sync with
// the same constant in app/middleware/auth.js so UI and server agree.
export const PAST_DUE_GRACE_DAYS = 7

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
  // last_stripe_event_at added to the select for the past_due grace check.
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('subscription_status, trial_ends_at, subscription_ends_at, last_stripe_event_at, stripe_customer_id, role')
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
  // G8: failed payment keeps full access for the grace window. Anchor is the
  // last Stripe event (the payment_failed that set past_due). No anchor →
  // treat as in-window (Stripe will reconcile shortly; don't lock out a payer).
  if (profile.subscription_status === 'past_due') {
    if (!profile.last_stripe_event_at) return true
    const graceEnds = new Date(
      new Date(profile.last_stripe_event_at).getTime() + PAST_DUE_GRACE_DAYS * 86400000
    )
    return graceEnds > now
  }
  return false
}