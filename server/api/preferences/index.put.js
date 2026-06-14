// File: server/api/preferences/index.put.js
//
// PUT /api/preferences — update settings. Body: { tempUnit: 'C' | 'F' }.
// Upsert (not update) so a missing row self-heals. RLS + the insert/update
// owner policies guarantee the caller can only write their own row; we also
// set user_id explicitly so the WITH CHECK passes.

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event, { requireSubscription: false })

  const body = await readBody(event) ?? {}
  const tempUnit = body.tempUnit
  if (tempUnit !== 'C' && tempUnit !== 'F') {
    throw createError({ statusCode: 400, statusMessage: "tempUnit must be 'C' or 'F'" })
  }

  const { data, error } = await db
    .from('preferences')
    .upsert(
      { user_id: user.id, temp_unit: tempUnit },
      { onConflict: 'user_id' }
    )
    .select('temp_unit')
    .single()

  if (error) throw await serverError('preferences.put.failed', error, { userId: user.id })

  return { temp_unit: data.temp_unit }
})