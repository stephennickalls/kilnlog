// File: server/api/stripe/checkout.post.js
//
// PACKAGE 5 — uses the shared pinned-version getStripe() factory.
// PACKAGE 1 behaviour retained: the stripe_customer_id write goes through
// serviceClient() because the column grants block user clients from writing
// privileged billing columns; the profile READ stays on the user-scoped db.
//
// DUPLICATE-SUBSCRIPTION GUARD (Jul 2026):
// Previously this created a checkout session unconditionally, so a customer
// who already had a live subscription could buy another — Stripe allows
// multiple subscriptions per customer and leaves preventing that to us.
// (Discovered via a pile of duplicate test-mode subs.)
//
// Now, before creating a session:
//   - If the customer has a subscription in a LIVE state (active, trialing,
//     past_due, unpaid), we don't sell them a second one — we return a portal
//     URL instead so they land on "manage billing" (fix card, cancel, etc.).
//   - Canceled/expired subscriptions don't block: a lapsed customer
//     re-subscribing is exactly what checkout is for.
//
// The client should follow `data.url` either way; `data.existing = true`
// signals the UI that it's the portal, not checkout, if it wants to message
// differently.

import { getStripe } from '~~/server/utils/stripe'

const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid']

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event, { requireSubscription: false })
  const stripe = getStripe()

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  if (profileErr) throw createError({ statusCode: 500, statusMessage: 'Could not load profile' })

  let customerId = profile.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    const { error: writeErr } = await serviceClient()
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)

    if (writeErr) {
      throw await serverError('stripe.checkout.customer_save_failed', writeErr, { userId: user.id })
    }
  } else {
    // Existing customer — check Stripe (source of truth, not our profiles
    // cache) for a live subscription before selling another one.
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status:   'all',
      limit:    100,
    })
    const live = (subs.data ?? []).filter(s => LIVE_STATUSES.includes(s.status))

    if (live.length > 0) {
      logger.warn('stripe.checkout.already_subscribed', {
        userId: user.id, customerId, liveSubIds: live.map(s => s.id),
      })
      const portal = await stripe.billingPortal.sessions.create({
        customer:   customerId,
        return_url: `${process.env.APP_URL}/account`,
      })
      return { data: { url: portal.url, existing: true } }
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer:                   customerId,
    payment_method_types:       ['card'],
    line_items:                 [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    mode:                       'subscription',
    success_url:                `${process.env.APP_URL}/app?subscribed=1`,
    cancel_url:                 `${process.env.APP_URL}/subscribe`,
    allow_promotion_codes:      true,
    billing_address_collection: 'auto',
    client_reference_id:        user.id,
  })

  return { data: { url: session.url, existing: false } }
})