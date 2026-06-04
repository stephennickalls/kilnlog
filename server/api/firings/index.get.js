// server/api/firings/index.get.js
// GET /api/firings — list all firings for the authenticated user.
// On each call, checks for stale active firings and auto-ends them:
//   Connected firing: no readings for 4 hours
//   Manual firing:    no readings for 2 hours
//   Either type:      started but never had a reading, and started > 1 hour ago
// Paused firings (paused_at set) are EXEMPT — the user deliberately suspended
// them (e.g. ran out of gas), so the reading gap is intentional.
//
// REQUIRES: the `paused_at` column on the firings table
// (migrations/add_pause_columns.sql). If that migration has NOT been run, this
// file will error — use the version without the paused_at guard instead.


const FOUR_HOURS = 4 * 60 * 60
const TWO_HOURS  = 2 * 60 * 60
const ONE_HOUR   = 1 * 60 * 60

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  // Fetch all active firings with their reading timestamps + paused state
  const { data: activeFirings, error: activeError } = await db
    .from('firings')
    .select(`
      id, mode, started_at, paused_at,
      readings:readings(timestamp)
    `)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .not('started_at', 'is', null)

  if (activeError) {
    logger.error('firings.list.active_query_failed', { userId: user.id, err: activeError })
    throw createError({ statusCode: 500, statusMessage: 'Could not load firings.' })
  }

  const now = Math.floor(Date.now() / 1000)
  const toAutoEnd = []

  for (const firing of activeFirings ?? []) {
    // Skip paused firings entirely — the reading gap is intentional.
    if (firing.paused_at) continue

    const mode     = firing.mode ?? 'connected'
    const readings = firing.readings ?? []

    // Safe reduce — avoids Math.max(...array) stack overflow on large arrays
    const lastTs = readings.length
      ? readings.reduce((max, r) => r.timestamp > max ? r.timestamp : max, readings[0].timestamp)
      : null

    if (lastTs === null) {
      if (now - firing.started_at > ONE_HOUR) {
        logger.info('firings.auto_end.queued', { firingId: firing.id, reason: 'no_readings', mode })
        toAutoEnd.push(firing.id)
      }
    } else if (mode === 'connected') {
      if (now - lastTs > FOUR_HOURS) {
        logger.info('firings.auto_end.queued', { firingId: firing.id, reason: 'signal_lost_4h', mode })
        toAutoEnd.push(firing.id)
      }
    } else {
      if (now - lastTs > TWO_HOURS) {
        logger.info('firings.auto_end.queued', { firingId: firing.id, reason: 'no_manual_readings_2h', mode })
        toAutoEnd.push(firing.id)
      }
    }
  }

  if (toAutoEnd.length) {
    const results = await Promise.all(
      toAutoEnd.map(id =>
        db.from('firings')
          .update({ ended_at: now, auto_ended: true })
          .eq('id', id)
          .eq('user_id', user.id)
      )
    )
    results.forEach((res, i) => {
      if (res.error) {
        logger.error('firings.auto_end.update_failed', { firingId: toAutoEnd[i], err: res.error })
      } else {
        logger.info('firings.auto_end.completed', { firingId: toAutoEnd[i] })
      }
    })
  }

  const { data, error } = await db
    .from('firings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('firings.list.query_failed', { userId: user.id, err: error })
    throw createError({ statusCode: 500, statusMessage: 'Could not load firings.' })
  }

  return data ?? []
})