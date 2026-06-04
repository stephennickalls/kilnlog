// server/utils/requireAdmin.js
// Gates an endpoint to admin users. Admin is now a role on the profiles table
// (profiles.role = 'admin'), set per-user in the database — no redeploy needed
// to grant it, and visible in your data.
//
// Returns { db, user, profile } like useServerUser; throws 403 for non-admins.

export async function requireAdmin(event) {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })

  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  return { db, user, profile }
}

// Convenience for non-admin role checks elsewhere, e.g. requireRole(event, 'support').
export async function requireRole(event, role) {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })

  if (profile?.role !== role && profile?.role !== 'admin') {
    // admin implicitly satisfies any role check
    throw createError({ statusCode: 403, statusMessage: `Requires role: ${role}` })
  }

  return { db, user, profile }
}