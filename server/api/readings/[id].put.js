// server/api/readings/[id].put.js
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  if (typeof body.temperature !== 'number' || body.temperature < -200 || body.temperature > 1400) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
  }

  const { data: reading } = await db
    .from('readings')
    .select('id, firing_id')
    .eq('id', id)
    .single()

  if (!reading) throw createError({ statusCode: 404, statusMessage: 'Reading not found' })

  const { data: firing } = await db
    .from('firings')
    .select('id')
    .eq('id', reading.firing_id)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 403, statusMessage: 'Not authorised' })

  const { data, error } = await db
    .from('readings')
    .update({ temperature: body.temperature })
    .eq('id', id)
    .select()
    .single()

  if (error) throw serverError('readings.update.failed', error, { userId: user.id, readingId: id })
  return data
})