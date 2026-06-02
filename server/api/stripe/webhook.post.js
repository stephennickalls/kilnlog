// server/api/stripe/webhook.post.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
  const sig      = getHeader(event, 'stripe-signature')

  const rawBody  = await readRawBody(event, false)

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    logger.error('stripe.webhook.signature_failed', { err })
    throw createError({ statusCode: 400, statusMessage: `Webhook error: ${err.message}` })
  }

  function mapStatus(s) {
    return ({
      trialing: 'trialing', active: 'active', canceled: 'canceled',
      past_due: 'past_due', unpaid: 'past_due', incomplete: 'past_due',
      incomplete_expired: 'expired', paused: 'canceled',
    })[s] ?? 'expired'
  }

  // current_period_end lives on the subscription item in newer API versions,
  // not the subscription object. Fall back gracefully if absent.
  function toIso(unixSeconds) {
    return Number.isFinite(unixSeconds) ? new Date(unixSeconds * 1000).toISOString() : null
  }

  function periodEnd(sub) {
    return sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end ?? null
  }

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
      logger.warn('stripe.webhook.no_row_updated', { customerId, type: stripeEvent.type })
    }
  }

  const obj = stripeEvent.data.object
  const ts  = stripeEvent.created

  switch (stripeEvent.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await updateProfile(obj.customer, {
        subscription_status:  mapStatus(obj.status),
        subscription_ends_at: toIso(periodEnd(obj)),
        trial_ends_at:        toIso(obj.trial_end),
      }, ts)
      break
    }
    case 'customer.subscription.deleted': {
      await updateProfile(obj.customer, {
        subscription_status:  'canceled',
        subscription_ends_at: toIso(periodEnd(obj)),
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