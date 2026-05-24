// server/api/library/index.get.js
// Schedule library is shared/built-in data — no user ownership needed.
// Uses a fresh client per request (no singleton) to be safe in serverless.
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

  const { data: libraries, error } = await db
    .from('schedule_library')
    .select('*')
    .order('type', { ascending: true })
    .order('name',  { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return Promise.all(libraries.map(async lib => {
    const { data: points } = await db
      .from('schedule_library_points')
      .select('*')
      .eq('library_id', lib.id)
      .order('offset_minutes', { ascending: true })
    return { ...lib, points: points ?? [] }
  }))
})