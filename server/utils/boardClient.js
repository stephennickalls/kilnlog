// server/utils/boardClient.js
import { createClient } from '@supabase/supabase-js'

let client = null

export function boardClient(event) {
  if (client) return client

  const config = useRuntimeConfig(event)

  const url =
    config.public?.supabase?.url ||
    config.public?.SUPABASE_URL ||
    process.env.SUPABASE_URL

  const key =
    config.public?.supabase?.key ||
    config.public?.SUPABASE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY

  if (!url || !key) {
    const missing = [!url && 'URL', !key && 'publishable key'].filter(Boolean).join(' and ')
    const found = Object.keys(config.public || {}).join(', ')
    throw createError({
      statusCode: 500,
      statusMessage: `Supabase ${missing} missing. public config keys: ${found}`
    })
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return client
}