// File: server/api/stripe/portal.post.js
//
// PACKAGE 5 — uses the shared pinned-version getStripe() factory.
import { getStripe } from '~~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const { profile } = await useServerUser(event, { requireSubscription: false })

  if (!profile?.stripe_customer_id) {
    throw createError({ statusCode: 400, statusMessage: 'No billing account found' })
  }

  const stripe = getStripe()

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${process.env.APP_URL}/account`,
  })

  return { data: { url: session.url } }
})