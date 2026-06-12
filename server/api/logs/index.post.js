// File: server/api/logs/index.post.js
// POST /api/logs — client error ingest.
// Browser-writable path, deliberately constrained:
//   - requires a valid user session
//   - only accepts level 'warn' | 'error'
//   - caps message and context size
//   - per-user rate limit (best-effort, DB-backed)
//
// PACKAGE 1 CHANGE: useServerUser's `db` is now user-scoped and the logs
// table has no RLS policies, so both the rate-limit count and the insert go
// through serviceClient(). Justified bypass: logs is policy-less by design;
// the row is still attributed to the *authenticated* user — never trust a
// user_id from the body.

const RATE_MAX    = 30      // max client logs per user per window
const RATE_WINDOW = 60      // seconds
const MAX_MESSAGE = 2000    // chars
const MAX_CONTEXT = 8000    // chars of serialized JSON

export default defineEventHandler(async (event) => {
  // Must be a logged-in user; no subscription requirement (errors can happen
  // on the subscribe page itself).
  const { user } = await useServerUser(event, { requireSubscription: false })
  const db = serviceClient()  // RLS bypass justified: logs is policy-less by design

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