// File: server/api/stripe/webhook.post.js
//
// PACKAGE 5 Stripe webhook hardening.
//   1. Pinned API version via getStripe() so periodEnd()/trial_end shapes are stable.
//   2. serviceClient() instead of a raw createClient (one sanctioned bypass path).
//   3. invoice.paid recovery: when a past_due customer's payment succeeds, we
//      re-derive status from the live subscription instead of waiting for a
//      customer.subscription.updated that may not arrive.
//   4. checkout.session.completed: logged (no-op for state) to aid support.
//   5. Returns 200 on unmapped/no-op events so Stripe does not retry forever.
//
// Idempotency: last_stripe_event_at gate drops out-of-order and replayed events.
//
// SEP 2026: every tracked log line now carries eventId + livemode so a Stripe
// retry (same eventId) is distinguishable from distinct events, and test-mode
// noise from live traffic. Prompted by 7 subscription_deleted rows in an hour
// that turned out to be admin test cancels.

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
    await logger.tracked('error', 'stripe.webhook.signature_failed', { err })
    throw createError({ statusCode: 400, statusMessage: `Webhook error: ${err.message}` })
  }

  // Tag for every log line in this request.
  const tag = { eventId: stripeEvent.id, livemode: stripeEvent.livemode, type: stripeEvent.type }

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
      await logger.tracked('warn', 'stripe.webhook.no_customer', tag)
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
      await logger.tracked('error', 'stripe.webhook.update_failed', { customerId, err: error, ...tag })
      throw createError({ statusCode: 500, statusMessage: 'Profile update failed' })
    }
    if (!data?.length) {
      // Either no matching customer, or a newer event already applied (normal).
      await logger.tracked('warn', 'stripe.webhook.no_row_updated', { customerId, ...tag })
    }
  }

  // Re-fetch the customer's subscription and sync status from source of truth.
  async function syncFromSubscription(customerId, eventTs) {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 })
    const sub  = subs.data?.[0]
    if (!sub) {
      await logger.tracked('warn', 'stripe.webhook.no_subscription_found', { customerId, ...tag })
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
      await logger.tracked('info', `stripe.${stripeEvent.type.split('.').pop()}`, {
        customerId: obj.customer, status: obj.status, ...tag,
      })
      await updateProfile(obj.customer, {
        subscription_status:  mapStatus(obj.status),
        subscription_ends_at: toIso(periodEnd(obj)),
        trial_ends_at:        toIso(obj.trial_end),
      }, ts)
      break
    }

    case 'customer.subscription.deleted': {
      await logger.tracked('info', 'stripe.subscription_deleted', { customerId: obj.customer, ...tag })
      await updateProfile(obj.customer, {
        subscription_status:  'canceled',
        subscription_ends_at: toIso(periodEnd(obj)),
      }, ts)
      break
    }

    case 'invoice.payment_failed': {
      await logger.tracked('warn', 'stripe.payment_failed', { customerId: obj.customer, ...tag })
      await updateProfile(obj.customer, { subscription_status: 'past_due' }, ts)
      break
    }

    // RECOVERY: a past_due customer fixed their card and the renewal invoice
    // was paid. Sync now from the live subscription so access is restored.
    case 'invoice.paid': {
      if (obj.subscription || obj.customer) {
        await syncFromSubscription(obj.customer, ts)
      }
      break
    }

    // No state change (subscription.created carries the real status). Log for
    // support traceability, then ack.
    case 'checkout.session.completed': {
      await logger.tracked('info', 'stripe.webhook.checkout_completed', {
        customerId: obj.customer,
        sessionId:  obj.id,
        mode:       obj.mode,
        ...tag,
      })
      break
    }

    default: {
      // Unhandled event type. Ack with 200 so Stripe stops retrying.
      logger.info('stripe.webhook.unhandled', tag)  // console-only: can be chatty
      break
    }
  }

  return { received: true }
})