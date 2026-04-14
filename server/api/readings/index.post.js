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

  // Stamp last_seen on any sensor assigned to this firing
  // Fire-and-forget — don't let this block or fail the response
  const nowUnix = Math.floor(Date.now() / 1000)
  db.from('firing_sensors')
    .select('sensor_id')
    .eq('firing_id', Number(firingId))
    .then(({ data: rows }) => {
      if (!rows?.length) return
      const sensorIds = rows.map(r => r.sensor_id)
      db.from('sensors')
        .update({ last_seen: nowUnix })
        .in('id', sensorIds)
        .then(() => {}) // ignore result
    })

  return { ok: true, id: data.id }
})