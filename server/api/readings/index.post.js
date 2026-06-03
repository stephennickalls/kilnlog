// server/api/readings/index.post.js

import { createClient } from '@supabase/supabase-js'

// Readings older than this many seconds before the firing started, or more than
// this many seconds in the future, are rejected as clock errors. The ESP32 falls
// back to millis-since-boot if NTP fails, which produces wildly wrong timestamps.
const MAX_FUTURE_SKEW = 5 * 60          // 5 min ahead of server clock
const MAX_PAST_BEFORE_START = 60 * 60   // 1 h before the firing started

// Shared field + range validation for both the sensor and manual paths.
function validateReading(body) {
  const { firingId, temperature, timestamp } = body

  if (!firingId || temperature === undefined || timestamp === undefined || timestamp === null) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: firingId, temperature, timestamp' })
  }
  if (typeof temperature !== 'number' || temperature < -200 || temperature > 1400) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid timestamp' })
  }

  const now = Math.floor(Date.now() / 1000)
  if (timestamp > now + MAX_FUTURE_SKEW) {
    throw createError({ statusCode: 400, statusMessage: 'Timestamp is in the future' })
  }

  return {
    firingId:    Number(firingId),
    temperature: Number(temperature),
    timestamp:   Number(timestamp),
  }
}

// Reject timestamps from before the firing plausibly started (clock-glitch guard).
function assertTimestampWithinFiring(timestamp, startedAt) {
  if (startedAt && timestamp < startedAt - MAX_PAST_BEFORE_START) {
    throw createError({ statusCode: 400, statusMessage: 'Timestamp predates the firing' })
  }
}

// Idempotent insert: on (firing_id, timestamp) conflict, update temperature
// instead of creating a duplicate row. Requires the unique constraint from
// migrations/add_readings_dedupe.sql.
async function upsertReading(db, row) {
  const { data, error } = await db
    .from('readings')
    .upsert(row, { onConflict: 'firing_id,timestamp', ignoreDuplicates: false })
    .select('id')
    .single()

  if (error) {
    logger.error('readings.insert.failed', { firingId: row.firing_id, err: error })
    throw createError({ statusCode: 500, statusMessage: 'Could not save reading' })
  }
  return data
}

export default defineEventHandler(async (event) => {
  const sensorToken = getHeader(event, 'x-sensor-token')

  if (sensorToken) {
    // ── Sensor path (ESP32) ──────────────────────────────────────────────────
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

    const { data: sensor, error: sensorErr } = await db
      .from('sensors')
      .select('id, user_id, name')
      .eq('token', sensorToken)
      .maybeSingle()

    if (sensorErr || !sensor) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid sensor token' })
    }

    const body = await readBody(event)
    const { firingId, temperature, timestamp } = validateReading(body)

    // Confirm sensor is assigned to this firing AND fetch the firing's start
    // in one go so we can range-check the timestamp.
    const { data: assignment } = await db
      .from('firing_sensors')
      .select('sensor_id, firings(started_at, ended_at)')
      .eq('firing_id', firingId)
      .eq('sensor_id', sensor.id)
      .maybeSingle()

    if (!assignment) {
      throw createError({ statusCode: 403, statusMessage: 'Sensor is not assigned to this firing' })
    }

    const firing = assignment.firings
    if (!firing || !firing.started_at || firing.ended_at) {
      throw createError({ statusCode: 409, statusMessage: 'Firing is not active' })
    }
    assertTimestampWithinFiring(timestamp, firing.started_at)

    // Stamp last_seen on the sensor row (best-effort; don't fail the write on it)
    await db.from('sensors').update({ last_seen: Math.floor(Date.now() / 1000) }).eq('id', sensor.id)

    const data = await upsertReading(db, {
      firing_id:   firingId,
      temperature,
      timestamp,
      sensor_id:   sensor.id,
    })
    return { ok: true, id: data.id }

  } else {
    // ── Manual / user session path ───────────────────────────────────────────
    const { db, user } = await useServerUser(event)

    const body = await readBody(event)
    const { firingId, temperature, timestamp } = validateReading(body)

    // Verify firing belongs to user, and grab started_at for the range check.
    const { data: firing } = await db
      .from('firings')
      .select('id, started_at')
      .eq('id', firingId)
      .eq('user_id', user.id)
      .single()

    if (!firing) throw createError({ statusCode: 403, statusMessage: 'Firing not found' })
    assertTimestampWithinFiring(timestamp, firing.started_at)

    const data = await upsertReading(db, {
      firing_id:   firingId,
      temperature,
      timestamp,
    })
    return { ok: true, id: data.id }
  }
})