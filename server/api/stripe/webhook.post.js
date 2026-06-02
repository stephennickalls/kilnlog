// server/api/stripe/webhook.post.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
  const sig      = getHeader(event, 'stripe-signature')
  const rawBody  = await readRawBody(event)

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: `Webhook error: ${err.message}` })
  }

  function mapStatus(s) {
    return ({
      trialing: 'trialing', active: 'active', canceled: 'canceled',
      past_due: 'past_due', unpaid: 'past_due', incomplete: 'past_due',
      incomplete_expired: 'expired', paused: 'canceled',
    })[s] ?? 'expired'
  }

  // Update only if this event is newer than what we last applied.
  // last_stripe_event_at guards against out-of-order delivery.
  async function updateProfile(customerId, updates, eventTs) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, last_stripe_event_at: new Date(eventTs * 1000).toISOString() })
      .eq('stripe_customer_id', customerId)
      .or(`last_stripe_event_at.is.null,last_stripe_event_at.lt.${new Date(eventTs * 1000).toISOString()}`)
      .select('id')

    if (error) {
      logger.error('stripe.webhook.update_failed', { customerId, err: error })
      throw createError({ statusCode: 500, statusMessage: 'Profile update failed' })
    }
    if (!data?.length) {
      // Either no matching customer, or a newer event already applied (safe to skip)
      logger.warn('stripe.webhook.no_row_updated', { customerId, type: stripeEvent.type })
    }
  }

  const obj = stripeEvent.data.object
  const ts  = stripeEvent.created  // unix seconds, authoritative ordering key

  switch (stripeEvent.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await updateProfile(obj.customer, {
        subscription_status:  mapStatus(obj.status),
        subscription_ends_at: new Date(obj.current_period_end * 1000).toISOString(),
        trial_ends_at:        obj.trial_end ? new Date(obj.trial_end * 1000).toISOString() : null,
      }, ts)
      break
    }
    case 'customer.subscription.deleted': {
      await updateProfile(obj.customer, {
        subscription_status:  'canceled',
        subscription_ends_at: new Date(obj.current_period_end * 1000).toISOString(),
      }, ts)
      break
    }
    case 'invoice.payment_failed': {
      await updateProfile(obj.customer, { subscription_status: 'past_due' }, ts)
      break
    }
  }

  return { received: true }
})