// File: server/api/account/export.get.js
//
// G7 — export-my-data (privacy). Bundles everything this user owns into one
// JSON document they can download. Uses the USER-SCOPED client, so RLS
// guarantees the export contains only their own rows — no service-role bypass,
// no chance of leaking another user's data into the file.
//
// requireSubscription:false — a lapsed/cancelled user must still be able to
// take their data with them.

export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })

  // Firings with their children. RLS scopes firings to the owner; the nested
  // selects ride along under the same policies.
  const { data: firings, error: firingsErr } = await db
    .from('firings')
    .select(`
      id, name, notes, started_at, ended_at, created_at, auto_ended,
      schedule_offset, paused_at, restarted_at,
      readings:readings(id, temperature, timestamp, created_at),
      schedule:schedule(id, offset_minutes, target_temp),
      reductions:reduction_periods(id, start_temp, end_temp, created_at)
    `)
    .order('created_at', { ascending: true })

  if (firingsErr) throw await serverError('account.export.firings_failed', firingsErr, { userId: user.id })

  // The user's own saved schedules (not built-in presets — those aren't theirs).
  const { data: schedules, error: schedErr } = await db
    .from('schedule_library')
    .select(`
      id, name, description, cone, type, source, created_at,
      points:schedule_library_points(id, offset_minutes, target_temp),
      reductions:reduction_periods(id, start_temp, end_temp, created_at)
    `)
    .not('user_id', 'is', null)   // exclude built-ins (RLS already hides others')
    .order('created_at', { ascending: true })

  if (schedErr) throw await serverError('account.export.schedules_failed', schedErr, { userId: user.id })

  // Preferences (temp unit, etc.)
  const { data: prefs } = await db
    .from('preferences')
    .select('temp_unit, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const bundle = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    account: {
      id:    user.id,
      email: user.email,
      profile: {
        full_name:            profile.full_name ?? null,
        subscription_status:  profile.subscription_status ?? null,
        trial_ends_at:        profile.trial_ends_at ?? null,
        subscription_ends_at: profile.subscription_ends_at ?? null,
      },
      preferences: prefs ?? { temp_unit: 'C' },
    },
    firings:   firings ?? [],
    schedules: schedules ?? [],
    note: 'All temperatures are in °C. Timestamps on firings/readings are unix seconds; profile/preferences use ISO 8601.',
  }

  // Suggest a filename to the client via Content-Disposition.
  const stamp = new Date().toISOString().slice(0, 10)
  setHeader(event, 'Content-Disposition', `attachment; filename="kilnmonitor-data-${stamp}.json"`)
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

  return bundle
})