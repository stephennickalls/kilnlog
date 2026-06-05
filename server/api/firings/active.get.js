// server/api/firings/active.get.js
//
// Called by the ESP32 every 10s via X-Sensor-Token header.
// Returns the active firing ONLY if this sensor is explicitly
// assigned to it via the firing_sensors join table.

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

  const token = getHeader(event, 'x-sensor-token')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing X-Sensor-Token' })

  const { data: sensor, error: sensorErr } = await db
    .from('sensors')
    .select('id, user_id, name')
    .eq('token', token)
    .maybeSingle()

  if (sensorErr) throw await serverError('firings.active.sensor_lookup_failed', sensorErr)
  if (!sensor) throw createError({ statusCode: 401, statusMessage: 'Invalid sensor token' })

  // Best-effort last_seen stamp
  await db.from('sensors').update({ last_seen: Math.floor(Date.now() / 1000) }).eq('id', sensor.id)

  const { data: assignments, error: assignErr } = await db
    .from('firing_sensors')
    .select('firing_id, role')
    .eq('sensor_id', sensor.id)

  if (assignErr) throw await serverError('firings.active.assignments_failed', assignErr, { sensorId: sensor.id })
  if (!assignments?.length) return { firingId: null, message: 'No active firing assigned to this sensor' }

  const firingIds = assignments.map(a => a.firing_id)
  const { data: firing, error: firingErr } = await db
    .from('firings')
    .select('id, name, started_at, ended_at')
    .in('id', firingIds)
    .not('started_at', 'is', null)
    .is('ended_at', null)
    .limit(1)
    .maybeSingle()

  if (firingErr) throw await serverError('firings.active.firing_query_failed', firingErr, { sensorId: sensor.id })

  if (!firing) return { firingId: null, message: 'No active firing assigned to this sensor' }

  return {
    firingId:  firing.id,
    name:      firing.name,
    startedAt: firing.started_at,
    sensorId:  sensor.id,
  }
})