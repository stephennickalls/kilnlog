// server/utils/useSupabase.js
import { createClient } from '@supabase/supabase-js'

let _client = null

export function useSupabase() {
  if (_client) return _client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env')

  _client = createClient(url, key)
  return _client
}