// server/utils/boardClient.js
import { createClient } from '@supabase/supabase-js'

let client = null

export function boardClient() {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.SUPABASE_URL
  const key = config.supabaseServiceKey

  if (!url || !key) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase URL or service key missing' })
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return client
}