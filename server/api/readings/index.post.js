// server/api/readings/index.post.js
// POST /api/readings — ingest a temperature reading from an ESP32 sensor.
//
// Authentication: X-Sensor-Token header (the sensor's UUID token).
// The token is looked up against the sensors table to identify the sensor
// and its owner. The sensor must be assigned to the firing via firing_sensors,
// which prevents any sensor posting to a firing it doesn't belong to.
//
// On success the reading is inserted with the resolved sensor_id (no more NULLs)
// and last_seen is stamped on the sensor row.

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // ── 1. Validate token ────────────────────────────────────────────────────
  const token = getHeader(event, 'x-sensor-token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing X-Sensor-Token' })
  }

  // Use the service-role client so RLS doesn't block the lookup
  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
  )

  const { data: sensor, error: sensorErr } = await db
    .from('sensors')
    .select('id, user_id, name')
    .eq('token', token)
    .maybeSingle()

  if (sensorErr || !sensor) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid sensor token' })
  }

  // ── 2. Validate body ─────────────────────────────────────────────────────
  const body = await readBody(event)
  const { firingId, temperature, timestamp } = body

  if (!firingId || temperature === undefined || !timestamp) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: firingId, temperature, timestamp' })
  }

  if (typeof temperature !== 'number' || temperature < -200 || temperature > 1400) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
  }

  // ── 3. Confirm this sensor is assigned to the firing ─────────────────────
  // Prevents sensors posting to firings they don't belong to
  const { data: assignment, error: assignErr } = await db
    .from('firing_sensors')
    .select('sensor_id')
    .eq('firing_id', Number(firingId))
    .eq('sensor_id', sensor.id)
    .maybeSingle()

  if (assignErr) {
    throw createError({ statusCode: 500, statusMessage: assignErr.message })
  }

  if (!assignment) {
    throw createError({ statusCode: 403, statusMessage: 'Sensor is not assigned to this firing' })
  }

  // ── 4. Insert reading with sensor_id populated ───────────────────────────
  const { data, error } = await db
    .from('readings')
    .insert({
      firing_id:   Number(firingId),
      temperature: Number(temperature),
      timestamp:   Number(timestamp),
      sensor_id:   sensor.id,            // no longer NULL
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // ── 5. Stamp last_seen on the sensor ─────────────────────────────────────
  const nowUnix = Math.floor(Date.now() / 1000)
  await db
    .from('sensors')
    .update({ last_seen: nowUnix })
    .eq('id', sensor.id)

  return { ok: true, id: data.id }
})