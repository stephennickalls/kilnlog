// File: server/api/stripe/checkout.post.js
//
// PACKAGE 5 — uses the shared pinned-version getStripe() factory.
// PACKAGE 1 behaviour retained: the stripe_customer_id write goes through
// serviceClient() because the column grants block user clients from writing
// privileged billing columns; the profile READ stays on the user-scoped db.
import { getStripe } from '~~/server/utils/stripe'

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
  })

  return { data: { url: session.url } }
})