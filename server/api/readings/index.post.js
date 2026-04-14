// server/api/readings/index.post.js

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { firingId, temperature, timestamp } = body

  if (!firingId || temperature === undefined || !timestamp) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: firingId, temperature, timestamp' })
  }

  if (typeof temperature !== 'number' || temperature < -200 || temperature > 1400) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
  }

  const db = useSupabase()

  // Insert the reading
  const { data, error } = await db
    .from('readings')
    .insert({ firing_id: Number(firingId), temperature: Number(temperature), timestamp: Number(timestamp) })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Stamp last_seen on sensors assigned to this firing
  const nowUnix = Math.floor(Date.now() / 1000)
  const { data: rows, error: fsErr } = await db
    .from('firing_sensors')
    .select('sensor_id')
    .eq('firing_id', Number(firingId))

  if (fsErr) console.error('[readings] firing_sensors lookup failed:', fsErr.message)

  if (rows?.length) {
    const sensorIds = rows.map(r => r.sensor_id)
    const { error: updateErr } = await db
      .from('sensors')
      .update({ last_seen: nowUnix })
      .in('id', sensorIds)
    if (updateErr) console.error('[readings] last_seen update failed:', updateErr.message)
  }

  return { ok: true, id: data.id, debug: { firingId: Number(firingId), sensorRows: rows?.length ?? 0, lastSeenStamped: nowUnix, updateErr: updateErr?.message ?? null } }
})