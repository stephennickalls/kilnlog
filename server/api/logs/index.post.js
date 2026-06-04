// server/api/logs/index.post.js
// POST /api/logs — client error ingest (Option B).
// This is a browser-writable path, so it is deliberately constrained:
//   - requires a valid user session (not open to the world)
//   - only accepts level 'warn' | 'error' (no info spam)
//   - caps message and context size
//   - per-user rate limit: rejects if this user has written > RATE_MAX rows
//     in the last RATE_WINDOW seconds (best-effort, DB-backed)
// Writes are attributed to the authenticated user and tagged source:'client'.

const RATE_MAX    = 30      // max client logs per user per window
const RATE_WINDOW = 60      // seconds
const MAX_MESSAGE = 2000    // chars
const MAX_CONTEXT = 8000    // chars of serialized JSON

export default defineEventHandler(async (event) => {
  // Must be a logged-in user; no subscription requirement (errors can happen
  // on the subscribe page itself).
  const { db, user } = await useServerUser(event, { requireSubscription: false })

  const body = await readBody(event)
  let { level, event: evt, message, context } = body ?? {}

  // Validate level — only warn/error accepted from clients.
  if (!['warn', 'error'].includes(level)) level = 'error'

  // Clamp strings.
  if (typeof message !== 'string') message = message ? String(message) : null
  if (message && message.length > MAX_MESSAGE) message = message.slice(0, MAX_MESSAGE) + '…'

  if (typeof evt !== 'string') evt = evt ? String(evt) : null
  if (evt && evt.length > 200) evt = evt.slice(0, 200)

  // Clamp context — serialize, size-check, reject oversize rather than store junk.
  let safeContext = null
  if (context !== undefined && context !== null) {
    try {
      const s = JSON.stringify(context)
      if (s.length <= MAX_CONTEXT) safeContext = context
      else safeContext = { truncated: true, preview: s.slice(0, MAX_CONTEXT) }
    } catch {
      safeContext = { unserializable: true }
    }
  }

  // ── Per-user rate limit (best-effort) ──────────────────────────────────────
  const windowStart = new Date(Date.now() - RATE_WINDOW * 1000).toISOString()
  const { count } = await db
    .from('logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('source', 'client')
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_MAX) {
    // Drop silently with a 429 — don't error the client's actual flow over a log.
    throw createError({ statusCode: 429, statusMessage: 'Log rate limit exceeded' })
  }

  const { error } = await db.from('logs').insert({
    level,
    source:  'client',
    event:   evt,
    message,
    context: safeContext,
    user_id: user.id,
  })

  if (error) {
    console.error(JSON.stringify({ level: 'error', event: 'logs.client_ingest.failed', error: error.message }))
    throw createError({ statusCode: 500, statusMessage: 'Could not record log' })
  }

  return { ok: true }
})