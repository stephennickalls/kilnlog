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

  const { data, error } = await db
    .from('readings')
    .insert({ firing_id: Number(firingId), temperature: Number(temperature), timestamp: Number(timestamp) })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, id: data.id }
})