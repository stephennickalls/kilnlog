// server/api/sensors/index.post.js
// POST /api/sensors — create a new sensor for the authenticated user.
// Generates a UUID token server-side — never trust the client for this.

import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const name = body?.name?.trim()

  if (!name) throw createError({ statusCode: 400, statusMessage: 'Sensor name is required' })

  const token = randomUUID()

  const { data, error } = await db
    .from('sensors')
    .insert({ name, user_id: user.id, token })
    .select('id, name, token, created_at, last_seen')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})