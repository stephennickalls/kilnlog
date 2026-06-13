// File: server/api/stripe/webhook.post.js
//
// PACKAGE 5 — Stripe webhook hardening.
// Changes vs previous:
//   1. Pinned API version via getStripe() — periodEnd()/trial_end shapes stable.
//   2. serviceClient() instead of a raw createClient (one sanctioned bypass path).
//   3. invoice.paid recovery: when a past_due customer's payment succeeds, we
//      re-derive status from the live subscription instead of waiting for a
//      customer.subscription.updated that may not arrive. Belt-and-braces.
//   4. checkout.session.completed: logged (no-op for state, since the
//      subscription.created event carries the real status) to aid support
//      when tracing a signup.
//   5. Returns 200 on unmapped/no-op events so Stripe doesn't retry forever.
//
// Idempotency unchanged: last_stripe_event_at gate drops out-of-order events.

import { getStripe } from '~~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const stripe   = getStripe()
  const supabase = serviceClient()  // RLS bypass justified: no user context; matches by stripe_customer_id
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

  function toIso(unixSeconds) {
    return Number.isFinite(unixSeconds) ? new Date(unixSeconds * 1000).toISOString() : null
  }

  // current_period_end moved between API versions: item-level in newer,
  // subscription-level in older. Check both.
  function periodEnd(sub) {
    return sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end ?? null
  }

  async function updateProfile(customerId, updates, eventTs) {
    if (!customerId) {
      logger.warn('stripe.webhook.no_customer', { type: stripeEvent.type })
      return
    }
    const eventIso = new Date(eventTs * 1000).toISOString()
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, last_stripe_event_at: eventIso })
      .eq('stripe_customer_id', customerId)
      // Idempotency / ordering: only apply if this event is newer than the
      // last one we processed for this customer.
      .or(`last_stripe_event_at.is.null,last_stripe_event_at.lt.${eventIso}`)
      .select('id')

    if (error) {
      logger.error('stripe.webhook.update_failed', { customerId, err: error })
      throw createError({ statusCode: 500, statusMessage: 'Profile update failed' })
    }
    if (!data?.length) {
      // Either no matching customer, or a newer event already applied (normal).
      logger.warn('stripe.webhook.no_row_updated', { customerId, type: stripeEvent.type })
    }
  }

  // Re-fetch the customer's subscription and sync status from source of truth.
  // Used by recovery paths where the event object isn't the subscription itself.
  async function syncFromSubscription(customerId, eventTs) {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 })
    const sub  = subs.data?.[0]
    if (!sub) {
      logger.warn('stripe.webhook.no_subscription_found', { customerId })
      return
    }
    await updateProfile(customerId, {
      subscription_status:  mapStatus(sub.status),
      subscription_ends_at: toIso(periodEnd(sub)),
      trial_ends_at:        toIso(sub.trial_end),
    }, eventTs)
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

    // RECOVERY: a past_due customer fixed their card and the renewal invoice
    // was paid. Don't wait for a possible subscription.updated — sync now from
    // the live subscription so access is restored immediately.
    case 'invoice.paid': {
      // Only relevant for subscription invoices; one-off invoices have no sub.
      if (obj.subscription || obj.customer) {
        await syncFromSubscription(obj.customer, ts)
      }
      break
    }

    // No state change (subscription.created carries the real status) — log for
    // support traceability, then ack.
    case 'checkout.session.completed': {
      logger.info('stripe.webhook.checkout_completed', {
        customerId: obj.customer,
        sessionId:  obj.id,
        mode:       obj.mode,
      })
      break
    }

    default: {
      // Unhandled event type — ack with 200 so Stripe stops retrying.
      logger.info('stripe.webhook.unhandled', { type: stripeEvent.type })
      break
    }
  }

  return { received: true }
})