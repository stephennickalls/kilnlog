// server/utils/logger.js
// Structured logger for Netlify Functions.
// - Always writes a JSON line to the console (visible in the Netlify log UI).
// - Persists warn/error to public.logs for the /admin/logs page.
//
// NETLIFY REALITY (Aug 2026 fix): fire-and-forget inserts are killed when the
// function freezes after the response — serverError.js discovered this the
// hard way. So:
//   logger.info/warn/error  — console immediately; persistence is attempted
//                             fire-and-forget (fine on dev / long routes; may
//                             be dropped on fast Netlify routes).
//   await logger.tracked()  — console + AWAITED persistence. Use for anything
//                             you actually need to see in /admin/logs:
//                             warns on request paths, business events
//                             (firing.started etc). Never throws.
//
// tracked() also persists 'info' rows — that's the point: durable business
// events. Plain info() stays console-only to bound table growth.
//
// Usage:
//   logger.info('event', { key: value })                       // console only
//   await logger.tracked('info', 'firing.started', { userId }) // durable
//   await logger.tracked('warn', 'stripe.checkout.already_subscribed', {...})

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

function buildRow(level, event, meta = {}) {
  const { err, message, userId, user_id, ...context } = meta
  return {
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
}

// Fire-and-forget persist (legacy path) — kept for call sites that must not
// add latency and can tolerate loss on function freeze.
function persist(level, event, meta = {}) {
  if (level === 'info') return            // plain info stays console-only
  const client = db()
  if (!client) return
  client.from('logs').insert(buildRow(level, event, meta)).then(() => {}, () => {})
}

// AWAITED persist — completes before the route returns, so it survives
// Netlify's freeze. Never throws.
async function persistAwait(level, event, meta = {}) {
  const client = db()
  if (!client) return
  try {
    await client.from('logs').insert(buildRow(level, event, meta))
  } catch {
    // console line is the fallback record
  }
}

function write(level, event, meta = {}) {
  consoleWrite(level, event, meta)
  try { persist(level, event, meta) } catch { /* never throw from logging */ }
}

export const logger = {
  info:  (event, meta) => write('info',  event, meta),
  warn:  (event, meta) => write('warn',  event, meta),
  error: (event, meta) => write('error', event, meta),

  // Durable structured event — console + awaited DB row (any level, incl info).
  tracked: async (level, event, meta = {}) => {
    consoleWrite(level, event, meta)
    await persistAwait(level, event, meta)
  },
}