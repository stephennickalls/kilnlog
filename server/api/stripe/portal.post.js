// server/api/stripe/portal.post.js
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const { user, profile } = await useServerUser(event, { requireSubscription: false })

  if (!profile?.stripe_customer_id) {
    throw createError({ statusCode: 400, statusMessage: 'No billing account found' })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${process.env.APP_URL}/account`,
  })

  return { data: { url: session.url } }
})