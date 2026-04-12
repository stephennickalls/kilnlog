// server/api/firings/active.get.js
//
// Called by the ESP32 every 10s via X-Sensor-Token header.
// Returns the active firing ONLY if this sensor is explicitly
// assigned to it via the firing_sensors join table.

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const token = getHeader(event, 'x-sensor-token')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing X-Sensor-Token' })

  // Look up sensor by token
  const { data: sensor, error: sensorErr } = await db
    .from('sensors')
    .select('id, user_id, name')
    .eq('token', token)
    .single()

  if (sensorErr || !sensor) throw createError({ statusCode: 401, statusMessage: 'Invalid sensor token' })

  // Find the active firing this sensor is explicitly assigned to
  const { data: assignment, error: assignErr } = await db
    .from('firing_sensors')
    .select(`
      role,
      firings (
        id, name, started_at, ended_at
      )
    `)
    .eq('sensor_id', sensor.id)
    .not('firings.started_at', 'is', null)
    .is('firings.ended_at', null)
    .maybeSingle()

  if (assignErr) throw createError({ statusCode: 500, statusMessage: assignErr.message })

  if (!assignment?.firings) {
    return { firingId: null, message: 'No active firing assigned to this sensor' }
  }

  const firing = assignment.firings

  return {
    firingId:  firing.id,
    name:      firing.name,
    startedAt: firing.started_at,
    sensorId:  sensor.id,
  }
})