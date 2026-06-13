// File: server/utils/stripe.js
//
// PACKAGE 5 — single Stripe client factory with a PINNED API version.
// Auto-imported by Nuxt from server/utils/ — call getStripe() directly in any
// server route, no import statement needed (same as serviceClient/useServerUser).
//
// Why pin: Stripe response shapes change between API versions. periodEnd() has
// to look in two places precisely because current_period_end moved between
// versions. With no pin, Stripe uses the account default, which can change
// under you and silently break field lookups. Pinning makes it deterministic.
//
// Set STRIPE_API_VERSION to your Stripe Dashboard's API version (Developers →
// API version). The value below is a recent known-good default.

import Stripe from 'stripe'

export const STRIPE_API_VERSION = '2025-03-31.basil'

let _stripe = null

export function getStripe() {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  return _stripe
}