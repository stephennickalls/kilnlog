// server/utils/useServerUser.js
import { createClient } from '@supabase/supabase-js'

export async function useServerUser(event) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw createError({ statusCode: 500, statusMessage: 'Supabase env vars not set' })

  const db = createClient(url, key)

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid session' })

  return { db, user }
}