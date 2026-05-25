// server/api/stripe/portal.post.js
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const { data: profile, error } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (error || !profile?.stripe_customer_id) {
    throw createError({ statusCode: 400, statusMessage: 'No billing account found' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${process.env.APP_URL}/account`,
  })

  return { data: { url: session.url } }
})