// File: server/api/account/delete.post.js
//
// G7 — delete-my-account (privacy). IRREVERSIBLE. Order of operations is chosen
// so a partial failure never bills a deleted account:
//   1. Verify the user (user-scoped) and re-check the typed confirmation here —
//      never trust the client alone for a destructive, unrecoverable action.
//   2. Cancel the Stripe subscription FIRST (if any), so we never delete the
//      account while leaving an active subscription billing a ghost. A Stripe
//      failure aborts before deletion (better to keep the account than to
//      orphan a live subscription).
//   3. Delete the auth user via the service-role ADMIN API. The user client
//      cannot delete its own auth.users row — this is a sanctioned bypass.
//   4. DB cascades wipe everything else: deleting auth.users cascades to
//      profiles, preferences, firings→(readings, schedule, reduction_periods),
//      schedule_library→(points, reduction_periods).
//
// requireSubscription:false — a past_due / cancelled user must be able to leave.
//
// getStripe uses the explicit import that the other stripe routes use in this
// codebase (NOT auto-import); serviceClient/useServerUser/logger auto-import.
import { getStripe } from '~~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const { user, profile } = await useServerUser(event, { requireSubscription: false })

  // Server-side confirmation gate. The client also requires typing DELETE, but
  // we re-check here so the endpoint can't be triggered without it.
  const body = await readBody(event) ?? {}
  if (body.confirm !== 'DELETE') {
    throw createError({ statusCode: 400, statusMessage: 'Confirmation text did not match.' })
  }

  // 1. Cancel the Stripe subscription first, if one exists. We look up live
  //    subscriptions by customer rather than trusting a stored id, so a
  //    half-synced profile can't leave a subscription running.
  if (profile?.stripe_customer_id) {
    try {
      const stripe = getStripe()
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all',
        limit: 100,
      })
      for (const sub of subs.data ?? []) {
        if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(sub.status)) {
          await stripe.subscriptions.cancel(sub.id)
        }
      }
    } catch (err) {
      // Abort before deleting — don't orphan a billing subscription.
      logger.error('account.delete.stripe_cancel_failed', { userId: user.id, err })
      throw createError({
        statusCode: 502,
        statusMessage: 'Could not cancel billing. Your account was not deleted — please try again or contact support.',
      })
    }
  }

  // 2. Delete the auth user via the admin API (service-role). Cascades do the
  //    rest. RLS bypass justified: a user cannot delete their own auth.users
  //    row through the user client.
  const admin = serviceClient()
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    logger.error('account.delete.auth_delete_failed', { userId: user.id, err: delErr })
    // Stripe is already cancelled at this point; surface a clear retry path.
    throw createError({
      statusCode: 500,
      statusMessage: 'Billing was cancelled but account deletion failed. Please try again or contact support.',
    })
  }

  logger.info('account.delete.success', { userId: user.id })
  return { deleted: true }
})