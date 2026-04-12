// server/utils/useServerUser.js
//
// Reads the Bearer token from the Authorization header,
// verifies it with Supabase, and returns { db, user }.
//
// The client sends this header via the global $fetch interceptor
// in plugins/auth-fetch.client.js

import { createClient } from '@supabase/supabase-js'

export async function useServerUser(event) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw createError({ statusCode: 500, statusMessage: 'Supabase env vars not set' })

  const db = createClient(url, key)

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid session' })

  return { db, user }
}