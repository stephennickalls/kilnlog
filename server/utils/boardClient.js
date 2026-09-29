// server/utils/boardClient.js
import { createClient } from '@supabase/supabase-js'

let client = null

export function boardClient() {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.SUPABASE_URL
  const key = config.public.SUPABASE_KEY

  if (!url || !key) {
    const missing = [!url && 'URL', !key && 'publishable key'].filter(Boolean).join(' and ')
    throw createError({ statusCode: 500, statusMessage: `Supabase ${missing} missing` })
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return client
}