// File: server/api/admin/users/[id].patch.js
//
// PATCH /api/admin/users/:id - change a user's role and/or subscription
// status from the admin console. Admin only.
//
// Body (all optional, at least one required):
//   { role: 'user' | 'admin' }
//   { subscriptionStatus: 'trialing' | 'beta' | 'active' | 'past_due' | 'canceled' }
//   { trialDays: number }   // resets trial_ends_at to now + N days
//
// SERVICE CLIENT: profiles has exactly two policies, both owner-scoped
// (profiles_select_own, profiles_update_own). A user-scoped client cannot
// read or write another person's row at all, so RLS bypass is required here.
// The requireAdmin gate runs first, so the bypass is never reachable
// unauthenticated.
//
// VALIDATION LIVES HERE, NOT IN A DB CHECK: profiles.role already has a CHECK
// constraint (user | admin) and that stays authoritative. subscription_status
// is deliberately left unconstrained in the database because the Stripe
// webhook writes to it, and a CHECK would turn an unrecognised Stripe status
// into a failed webhook. So the allowed set is enforced at this one door.
//
// GUARDRAILS:
//   - You cannot change your own role. Prevents an admin demoting themselves
//     out of the console they are standing in.
//   - The last remaining admin cannot be demoted.
//
// Note that promoting someone to admin is enough on its own: hasAccess()
// returns true for role === 'admin' regardless of subscription_status, so an
// admin never needs a status change to keep working.

import { invalidateProfileCache } from '../../../utils/useServerUser'

const ROLES    = ['user', 'admin']
const STATUSES = ['trialing', 'beta', 'active', 'past_due', 'canceled']
const UUID     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const { user: actor } = await requireAdmin(event)

  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!UUID.test(id ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const updates = {}

  if (body?.role !== undefined) {
    if (!ROLES.includes(body.role)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
    }
    if (id === actor.id) {
      throw createError({ statusCode: 403, statusMessage: 'You cannot change your own role' })
    }
    updates.role = body.role
  }

  if (body?.subscriptionStatus !== undefined) {
    if (!STATUSES.includes(body.subscriptionStatus)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid subscription status' })
    }
    updates.subscription_status = body.subscriptionStatus
  }

  if (body?.trialDays !== undefined) {
    const days = Number(body.trialDays)
    if (!Number.isFinite(days) || days < 0 || days > 3650) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid trial length' })
    }
    updates.trial_ends_at = new Date(Date.now() + days * 86400000).toISOString()
  }

  if (!Object.keys(updates).length) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const db = serviceClient()

  const { data: target, error: readErr } = await db
    .from('profiles')
    .select('id, email, role, subscription_status, trial_ends_at')
    .eq('id', id)
    .single()

  if (readErr || !target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Only pay for the count when this request actually demotes an admin.
  if (updates.role === 'user' && target.role === 'admin') {
    const { count, error: cErr } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (cErr) throw await serverError('admin.users.admin_count_failed', cErr, { userId: actor.id })
    if ((count ?? 0) <= 1) {
      throw createError({ statusCode: 409, statusMessage: 'Cannot demote the last admin' })
    }
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, email, full_name, role, subscription_status, trial_ends_at')
    .single()

  if (error) {
    throw await serverError('admin.users.update_failed', error, { userId: actor.id, targetId: id })
  }

  // useServerUser caches the profile in-process for 30s. Drop the target's
  // entry so a promotion or a status change is felt on their very next
  // request instead of up to half a minute later.
  invalidateProfileCache(id)

  // Durable: who changed whose access, and to what. This is the audit trail
  // for the one endpoint that can hand out admin.
  await logger.tracked('info', 'admin.user.updated', {
    userId:      actor.id,
    targetId:    id,
    targetEmail: target.email,
    from:        { role: target.role, status: target.subscription_status },
    to:          { role: data.role, status: data.subscription_status },
  })

  return data
})