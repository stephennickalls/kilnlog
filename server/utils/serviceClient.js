// File: server/utils/serviceClient.js
//
// The ONLY sanctioned path to a service-role (RLS-bypassing) Supabase client.
// Every call site must justify why RLS bypass is needed. Legitimate uses:
//   - Stripe webhook (no user context; matches rows by stripe_customer_id)
//   - logs table reads/writes (logs has RLS on, zero policies — by design)
//   - profile writes of privileged columns (stripe_customer_id) that the
//     column grants deliberately block for user clients
//   - logger.js / serverError.js persistence
//
// Singleton: reused across warm invocations on Netlify Functions.

import { createClient } from '@supabase/supabase-js'

let _client = null

export function serviceClient() {
  if (_client) return _client
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.supabaseSecretKey
  if (!url || !key) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase env vars not set' })
  }
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}