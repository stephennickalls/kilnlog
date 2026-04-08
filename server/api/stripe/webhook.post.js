// server/api/stripe/webhook.post.js
// Stripe sends events here when subscriptions change
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const sig       = getHeader(event, 'stripe-signature')
  const rawBody   = await readRawBody(event)

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: `Webhook error: ${err.message}` })
  }

  const subscription = stripeEvent.data.object

  // Map Stripe status to our status
  function mapStatus(stripeStatus) {
    const map = {
      trialing:         'trialing',
      active:           'active',
      canceled:         'canceled',
      past_due:         'past_due',
      unpaid:           'past_due',
      incomplete:       'past_due',
      incomplete_expired: 'expired',
      paused:           'canceled',
    }
    return map[stripeStatus] ?? 'expired'
  }

  async function updateProfile(customerId, updates) {
    await supabase
      .from('profiles')
      .update(updates)
      .eq('stripe_customer_id', customerId)
  }

  switch (stripeEvent.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await updateProfile(subscription.customer, {
        subscription_status:   mapStatus(subscription.status),
        subscription_ends_at:  new Date(subscription.current_period_end * 1000).toISOString(),
        trial_ends_at:         subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      })
      break
    }

    case 'customer.subscription.deleted': {
      await updateProfile(subscription.customer, {
        subscription_status:  'canceled',
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object
      await updateProfile(invoice.customer, {
        subscription_status: 'past_due',
      })
      break
    }
  }

  return { received: true }
})