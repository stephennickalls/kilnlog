// server/utils/serverError.js
// Standardises 500-level failures: logs the real error server-side (console +
// logs table, awaited so it completes before Netlify kills the function context)
// while returning a generic message to the client.
//
// IMPORTANT: call sites must use `throw await serverError(...)` — not
// `throw serverError(...)` — because this function is async and must complete
// its DB write before the route returns.
//
// Usage:
//   if (error) throw await serverError('x.query_failed', error, { userId })
//
// Client receives:  500 "Something went wrong. Please try again."
// Netlify logs get: full JSON line (console.error)
// /logs page gets:  persisted row (awaited — survives Netlify function shutdown)

import { createClient } from '@supabase/supabase-js'

export async function serverError(event, err, context = {}) {
  // Always write to console — survives even if the DB insert fails.
  console.error(JSON.stringify({
    ts:    new Date().toISOString(),
    level: 'error',
    event,
    ...context,
    error: err?.message ?? String(err),
    stack: err?.stack ?? null,
  }))

  // Await the DB insert so it completes before the Netlify Function returns.
  // logger.js uses fire-and-forget (.then without await) which is killed by
  // Netlify before it resolves — that is why /logs was always empty.
  try {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (url && key) {
      const db = createClient(url, key, { auth: { persistSession: false } })
      await db.from('logs').insert({
        level:   'error',
        source:  'server',
        event:   event ?? null,
        message: err?.message ?? String(err),
        context: {
          ...context,
          ...(err?.stack ? { stack: err.stack } : {}),
        },
        user_id: context.userId ?? context.user_id ?? null,
      })
    }
  } catch {
    // Never let logging break the route — console line above is the fallback.
  }

  return createError({
    statusCode:    500,
    statusMessage: 'Something went wrong. Please try again.',
  })
}