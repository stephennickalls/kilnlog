// File: server/api/admin/stats.get.js
//
// GET /api/admin/stats - counts for the /admin landing cards. Head-only count
// queries, no row payload, so this stays cheap enough to run on every visit.
//
// "users" EXCLUDES admins. Staff accounts are not customers: they do not
// consume a beta slot (public.beta_slots_used already filters them out) and
// they must not inflate the number an admin reads at a glance. admins is
// returned separately so the page can show it without a second request.
//
// Counting profiles rather than auth.users keeps this consistent with
// beta-slots.get.js. The two only diverge if a signup ever lands without a
// profile row, which the audit showed is currently zero.
export default defineEventHandler(async (event) => {
  const { user } = await requireAdmin(event)

  // RLS bypass justified: profiles is owner-scoped (profiles_select_own), so a
  // user-scoped client can only ever count one row - its own.
  const db = serviceClient()

  const [users, admins, openFeedback] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    db.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  if (users.error)        throw await serverError('admin.stats.users_failed', users.error, { userId: user.id })
  if (admins.error)       throw await serverError('admin.stats.admins_failed', admins.error, { userId: user.id })
  if (openFeedback.error) throw await serverError('admin.stats.feedback_failed', openFeedback.error, { userId: user.id })

  return {
    users:         users.count ?? 0,
    admins:        admins.count ?? 0,
    open_feedback: openFeedback.count ?? 0,
  }
})