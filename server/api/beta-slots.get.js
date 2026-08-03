// File: server/api/beta-slots.get.js
// PUBLIC — { total, used, remaining }. Service client bypasses RLS.
// "used" counts non-admin profiles only, matching the auth.users cap trigger
// (public.beta_slots_used) — admins and other staff don't consume a spot.
// Throws on failure: the page must show an error, never "0 spots left".
export default defineEventHandler(async () => {
  const db = serviceClient()

  const { data: settings, error: sErr } = await db
    .from('app_settings')
    .select('beta_max_slots')
    .single()
  if (sErr) throw await serverError('beta.slots_settings_failed', sErr)

  const { count, error: cErr } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .neq('role', 'admin')
  if (cErr) throw await serverError('beta.slots_count_failed', cErr)

  const total = settings.beta_max_slots
  const used  = count ?? 0
  return { total, used, remaining: Math.max(total - used, 0) }
})