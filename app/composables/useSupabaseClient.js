// composables/useSupabaseClient.js
import { createClient } from '@supabase/supabase-js'

let client = null

export function useSupabaseClient() {
  if (!client) {
    const config = useRuntimeConfig()
    client = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )
  }
  return client
}