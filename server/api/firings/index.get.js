// server/api/firings/index.get.js
// GET /api/firings — list all firings for the authenticated user.
// On each call, checks for stale active firings and auto-ends them:
//   Connected firing: no readings for 4 hours
//   Manual firing:    no readings for 2 hours
//   Either type:      started but never had a reading, and started > 1 hour ago

const FOUR_HOURS  = 4 * 60 * 60
const TWO_HOURS   = 2 * 60 * 60
const ONE_HOUR    = 1 * 60 * 60

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  // Fetch all active firings (no ended_at) with their last reading timestamp
  const { data: activeFirings, error: activeError } = await db
    .from('firings')
    .select(`
      id, mode, started_at,
      readings:readings(timestamp)
    `)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .not('started_at', 'is', null)

  if (activeError) throw createError({ statusCode: 500, statusMessage: activeError.message })

  const now = Math.floor(Date.now() / 1000)
  const toAutoEnd = []

  for (const firing of activeFirings ?? []) {
    const mode = firing.mode ?? 'connected'
    const readings = firing.readings ?? []
    const lastTs = readings.length
      ? Math.max(...readings.map(r => r.timestamp))
      : null

    const noReadings = lastTs === null

    if (noReadings) {
      // Never had a reading — auto-end after 1 hour regardless of mode
      if (now - firing.started_at > ONE_HOUR) {
        toAutoEnd.push(firing.id)
      }
    } else if (mode === 'connected') {
      if (now - lastTs > FOUR_HOURS) toAutoEnd.push(firing.id)
    } else {
      // manual
      if (now - lastTs > TWO_HOURS) toAutoEnd.push(firing.id)
    }
  }

  // Auto-end stale firings in parallel
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

  // Now fetch the full list (stale ones are now ended)
  const { data, error } = await db
    .from('firings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})