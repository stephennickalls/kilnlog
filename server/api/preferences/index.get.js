// File: server/api/preferences/index.get.js
//
// GET /api/preferences — the caller's settings. RLS restricts to their own
// row. If no row exists (edge case — backfill/seed should prevent it), return
// the default so the UI never breaks.

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event, { requireSubscription: false })

  const { data, error } = await db
    .from('preferences')
    .select('temp_unit')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw await serverError('preferences.get.failed', error, { userId: user.id })

  return { temp_unit: data?.temp_unit ?? 'C' }
})
