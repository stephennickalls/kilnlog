// server/api/sensors/[id].put.js
// PUT /api/sensors/:id — rename a sensor (ownership checked)

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: existing } = await db
    .from('sensors')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Sensor not found' })

  const { data, error } = await db
    .from('sensors')
    .update({ name: body.name?.trim() })
    .eq('id', id)
    .select('id, name, token, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})