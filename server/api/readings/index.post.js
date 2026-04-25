// server/api/readings/index.post.js

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'x-sensor-token')

  if (token) {
    // ── Sensor path (ESP32) ──────────────────────────────────────────────────
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

    const body = await readBody(event)
    const { firingId, temperature, timestamp } = body

    if (!firingId || temperature === undefined || !timestamp) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields: firingId, temperature, timestamp' })
    }

    if (typeof temperature !== 'number' || temperature < -200 || temperature > 1400) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
    }

    // Confirm sensor is assigned to this firing
    const { data: assignment } = await db
      .from('firing_sensors')
      .select('sensor_id')
      .eq('firing_id', Number(firingId))
      .eq('sensor_id', sensor.id)
      .maybeSingle()

    if (!assignment) {
      throw createError({ statusCode: 403, statusMessage: 'Sensor is not assigned to this firing' })
    }

    // Stamp last_seen on the sensor row
    await db.from('sensors').update({ last_seen: Math.floor(Date.now() / 1000) }).eq('id', sensor.id)

    const { data, error } = await db
      .from('readings')
      .insert({
        firing_id:   Number(firingId),
        temperature: Number(temperature),
        timestamp:   Number(timestamp),
        sensor_id:   sensor.id,
      })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, id: data.id }

  } else {
    // ── Manual / user session path ───────────────────────────────────────────
    const { db, user } = await useServerUser(event)

    const body = await readBody(event)
    const { firingId, temperature, timestamp } = body

    if (!firingId || temperature === undefined || !timestamp) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields: firingId, temperature, timestamp' })
    }

    if (typeof temperature !== 'number' || temperature < -200 || temperature > 1400) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
    }

    // Verify the firing belongs to this user
    const { data: firing } = await db
      .from('firings')
      .select('id')
      .eq('id', Number(firingId))
      .eq('user_id', user.id)
      .maybeSingle()

    if (!firing) throw createError({ statusCode: 403, statusMessage: 'Firing not found or access denied' })

    const { data, error } = await db
      .from('readings')
      .insert({
        firing_id:   Number(firingId),
        temperature: Number(temperature),
        timestamp:   Number(timestamp),
      })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, id: data.id }
  }
})