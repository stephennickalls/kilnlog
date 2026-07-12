// File: server/utils/useServerUser.js
//
// PACKAGE 1 REFACTOR — RLS becomes real (unchanged; see history).
// PACKAGE 7 (G8) — past_due grace window (unchanged; see hasAccess below).
//
// PERF REFACTOR (Jul 2026) — kill the two fixed-cost round trips that every
// API route was paying before doing any real work:
//
//   1. JWT verification is now LOCAL. Previously db.auth.getUser(token) made a
//      network call to Supabase Auth on every request (~600ms+ cross-region).
//      The project signs access tokens with an asymmetric ECC P-256 key, so we
//      verify the signature against the project's public JWKS
//      (<url>/auth/v1/.well-known/jwks.json) using `jose`. The JWKS is fetched
//      once and cached in-process across warm invocations (createRemoteJWKSet
//      handles caching + key rotation refetches automatically).
//      Fallback: if local verification fails (e.g. a still-live token signed
//      by the legacy HS256 key, or a JWKS fetch hiccup), we fall back to the
//      old network call rather than locking anyone out.
//
//   2. The profiles row (subscription gate) is cached in-process for a short
//      TTL, keyed by user id. Warm Netlify invocations skip the query. TTL is
//      30s — a Stripe webhook flipping subscription_status takes effect within
//      30s, which is acceptable; access-REVOKING states were already grace-
//      windowed by days, not seconds. Cold starts still pay one profile query.
//
// Return shape is unchanged: { db, user, profile }.
// Needs service role instead? Use serviceClient() and justify at the call site.

import { createClient } from '@supabase/supabase-js'
import { jwtVerify, createRemoteJWKSet } from 'jose'

// Grace window for a past_due (failed-payment) subscriber. Keep in sync with
// the same constant in app/middleware/auth.js so UI and server agree.
export const PAST_DUE_GRACE_DAYS = 7

// ── In-process caches (survive across warm Netlify invocations) ─────────────
let _jwks = null
function getJwks(supabaseUrl) {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  }
  return _jwks
}

const PROFILE_TTL_MS = 30_000
const _profileCache = new Map() // userId -> { profile, expires }

function getCachedProfile(userId) {
  const hit = _profileCache.get(userId)
  if (hit && hit.expires > Date.now()) return hit.profile
  _profileCache.delete(userId)
  return null
}

function setCachedProfile(userId, profile) {
  // Bound the cache so a long-lived warm lambda can't grow unbounded.
  if (_profileCache.size > 500) _profileCache.clear()
  _profileCache.set(userId, { profile, expires: Date.now() + PROFILE_TTL_MS })
}

// Exported so mutation paths (e.g. the Stripe webhook, account deletion) can
// invalidate immediately instead of waiting out the TTL.
export function invalidateProfileCache(userId) {
  if (userId) _profileCache.delete(userId)
  else _profileCache.clear()
}

// ─────────────────────────────────────────────────────────────────────────────
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

  // ── 1. Verify the JWT locally (signature + expiry + issuer + audience) ───
  let user = null
  try {
    const { payload } = await jwtVerify(token, getJwks(url), {
      issuer:   `${url}/auth/v1`,
      audience: 'authenticated',
    })
    if (!payload.sub) throw new Error('No subject')
    user = {
      id:           payload.sub,
      email:        payload.email ?? null,
      role:         payload.role ?? 'authenticated',
      app_metadata: payload.app_metadata ?? {},
    }
  } catch {
    // Fallback: legacy-HS256 token still in flight, or a JWKS fetch hiccup.
    // One network round trip — the pre-refactor behaviour, now the exception
    // rather than the rule.
    const { data, error } = await db.auth.getUser(token)
    if (error || !data?.user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
    }
    user = data.user
  }

  // ── 2. Profile (subscription gate), with short-TTL in-process cache ──────
  let profile = getCachedProfile(user.id)
  if (!profile) {
    // Reads the caller's own row under the profiles owner RLS policy.
    const { data, error: profErr } = await db
      .from('profiles')
      .select('subscription_status, trial_ends_at, subscription_ends_at, last_stripe_event_at, stripe_customer_id, role')
      .eq('id', user.id)
      .single()

    if (profErr || !data) {
      throw createError({ statusCode: 403, statusMessage: 'No profile found' })
    }
    profile = data
    setCachedProfile(user.id, profile)
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