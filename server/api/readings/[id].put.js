export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  if (typeof body.temperature !== 'number' || body.temperature < -200 || body.temperature > 1400) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid temperature value' })
  }

  const db = useSupabase()
  const { data, error } = await db
    .from('readings')
    .update({ temperature: body.temperature })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})