// server/utils/logger.js
// Structured logger for Netlify Functions.
// - Always writes a JSON line to the console (visible in the Netlify log UI).
// - Additionally persists warn/error to the public.logs table so they show up
//   in the in-app /logs page. Persistence is BEST-EFFORT: it never throws and
//   never blocks the calling request — a logging failure must not break a route.
//
// Usage: logger.info('event', { key: value })
//        logger.warn('event', { key: value })
//        logger.error('event', { key: value, err })

import { createClient } from '@supabase/supabase-js'

// Lazily-created service-key client. Reused across invocations when warm.
let _db = null
function db() {
  if (_db) return _db
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  _db = createClient(url, key, { auth: { persistSession: false } })
  return _db
}

function consoleWrite(level, event, meta = {}) {
  const { err, ...rest } = meta
  const entry = {
    ts:    new Date().toISOString(),
    level,
    event,
    ...rest,
    ...(err ? { error: err?.message ?? String(err), stack: err?.stack } : {}),
  }
  const fn = level === 'info' ? console.log : console.error
  fn(JSON.stringify(entry))
}

// Fire-and-forget DB persist. Swallows all errors. Only warn/error by default
// to keep the table from filling with routine info lines.
function persist(level, event, meta = {}) {
  if (level === 'info') return            // skip info to bound table growth
  const client = db()
  if (!client) return

  const { err, message, userId, user_id, ...context } = meta
  const row = {
    level,
    source:  'server',
    event:   event ?? null,
    message: message ?? err?.message ?? null,
    user_id: userId ?? user_id ?? null,
    context: {
      ...context,
      ...(err ? { error: err?.message ?? String(err), stack: err?.stack } : {}),
    },
  }

  // Do not await — never block the request on logging. Catch so an unhandled
  // rejection can't take down the function.
  client.from('logs').insert(row).then(
    () => {},
    () => {}   // swallow — console line above is the fallback record
  )
}

function write(level, event, meta = {}) {
  consoleWrite(level, event, meta)
  try { persist(level, event, meta) } catch { /* never throw from logging */ }
}

export const logger = {
  info:  (event, meta) => write('info',  event, meta),
  warn:  (event, meta) => write('warn',  event, meta),
  error: (event, meta) => write('error', event, meta),
}