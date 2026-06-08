// server/api/firings/index.get.js
// GET /api/firings — list all firings for the authenticated user.
// On each call, checks for stale active firings and auto-ends them:
//   No readings for 2 hours, OR
//   Started but never had a reading, and started > 1 hour ago.
// Paused firings (paused_at set) are EXEMPT — the user deliberately suspended
// them, so the reading gap is intentional.

const TWO_HOURS = 2 * 60 * 60
const ONE_HOUR  = 1 * 60 * 60

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const { data: activeFirings, error: activeError } = await db
    .from('firings')
    .select(`
      id, started_at, paused_at,
      readings:readings(timestamp)
    `)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .not('started_at', 'is', null)

  if (activeError) throw await serverError('firings.list.active_query_failed', activeError, { userId: user.id })

  const now = Math.floor(Date.now() / 1000)
  const toAutoEnd = []

  for (const firing of activeFirings ?? []) {
    if (firing.paused_at) continue

    const readings = firing.readings ?? []
    const lastTs = readings.length
      ? readings.reduce((max, r) => r.timestamp > max ? r.timestamp : max, readings[0].timestamp)
      : null

    if (lastTs === null) {
      if (now - firing.started_at > ONE_HOUR) toAutoEnd.push(firing.id)
    } else if (now - lastTs > TWO_HOURS) {
      toAutoEnd.push(firing.id)
    }
  }

  if (toAutoEnd.length) {
    await Promise.all(
      toAutoEnd.map(id =>
        db.from('firings')
          .update({ ended_at: now, auto_ended: true })
          .eq('id', id)
          .eq('user_id', user.id)
      )
    )
  }

  const { data, error } = await db
    .from('firings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw await serverError('firings.list.query_failed', error, { userId: user.id })

  return data ?? []
})