// server/api/library/index.get.js
// Schedule library is shared/built-in data — no user ownership needed.
// Single query with nested select — no N+1.
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

  const { data, error } = await db
    .from('schedule_library')
    .select('*, points:schedule_library_points(*)')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Sort nested points by offset (nested order isn't guaranteed)
  return (data ?? []).map(lib => ({
    ...lib,
    points: (lib.points ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes),
  }))
})