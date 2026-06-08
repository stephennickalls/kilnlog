// server/api/readings/index.post.js

const MAX_FUTURE_SKEW = 5 * 60
const MAX_PAST_BEFORE_START = 60 * 60

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
  return { firingId: Number(firingId), temperature: Number(temperature), timestamp: Number(timestamp) }
}

function assertTimestampWithinFiring(timestamp, startedAt) {
  if (startedAt && timestamp < startedAt - MAX_PAST_BEFORE_START) {
    throw createError({ statusCode: 400, statusMessage: 'Timestamp predates the firing' })
  }
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const { firingId, temperature, timestamp } = validateReading(body)

  const { data: firing } = await db
    .from('firings')
    .select('id, started_at')
    .eq('id', firingId)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 403, statusMessage: 'Firing not found' })
  assertTimestampWithinFiring(timestamp, firing.started_at)

  const { data, error } = await db
    .from('readings')
    .upsert(
      { firing_id: firingId, temperature, timestamp },
      { onConflict: 'firing_id,timestamp', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error) throw await serverError('readings.insert.failed', error, { userId: user.id, firingId })
  return { ok: true, id: data.id }
})