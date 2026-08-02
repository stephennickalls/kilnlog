// File: server/api/logs/index.get.js
// GET /api/logs — admin-only. Returns recent log rows, newest first.
// Query params: ?level=error|warn|info  ?limit=100  ?before=<ISO>  ?source=server|client
//
// HEALTH STATS (Aug 2026): ?stats=1 instead returns a 24h/7d summary for the
// at-a-glance strip on /admin/logs — counts by level and the top error events,
// computed here in JS (PostgREST aggregates are disabled on Supabase).
//
// PACKAGE 1 CHANGE: requireAdmin's `db` is now user-scoped, and `logs` has
// RLS enabled with zero policies (locked to the Data API by design) — a user
// client would see nothing. The logs query therefore uses serviceClient(),
// AFTER the admin check has passed. Justified bypass: admin observability.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)            // throws 403 for non-admins
  const db = serviceClient()           // RLS bypass justified: logs is policy-less by design
  const q = getQuery(event)

  // ── Health summary mode ────────────────────────────────────────────────────
  if (q.stats) {
    const dayAgo  = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    const { data, error } = await db
      .from('logs')
      .select('level, source, event, created_at')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) {
      console.error(JSON.stringify({ level: 'error', event: 'logs.stats.failed', error: error.message }))
      throw createError({ statusCode: 500, statusMessage: 'Could not load log stats' })
    }

    const rows = data ?? []
    const day = rows.filter(r => r.created_at >= dayAgo)

    const countBy = (list, pred) => list.filter(pred).length
    const topEvents = (list) => {
      const m = new Map()
      for (const r of list) {
        if (r.level !== 'error') continue
        m.set(r.event ?? '(no event)', (m.get(r.event ?? '(no event)') ?? 0) + 1)
      }
      return [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([event, count]) => ({ event, count }))
    }

    return {
      day: {
        errors: countBy(day, r => r.level === 'error'),
        warns:  countBy(day, r => r.level === 'warn'),
        client: countBy(day, r => r.source === 'client'),
      },
      week: {
        errors: countBy(rows, r => r.level === 'error'),
        warns:  countBy(rows, r => r.level === 'warn'),
      },
      top_errors_24h: topEvents(day),
      last_error_at: rows.find(r => r.level === 'error')?.created_at ?? null,
      sampled: rows.length >= 2000,   // true → week counts are a floor, not exact
    }
  }

  // ── Row list mode (unchanged) ──────────────────────────────────────────────
  const limit = Math.min(Math.max(Number(q.limit) || 100, 1), 500)

  let query = db
    .from('logs')
    .select('id, created_at, level, source, event, message, context, user_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (q.level  && ['info','warn','error'].includes(q.level))   query = query.eq('level', q.level)
  if (q.source && ['server','client'].includes(q.source))      query = query.eq('source', q.source)
  if (q.before)                                                query = query.lt('created_at', q.before)

  const { data, error } = await query
  if (error) {
    // Use console directly here — don't recurse through logger into the table.
    console.error(JSON.stringify({ level: 'error', event: 'logs.read.failed', error: error.message }))
    throw createError({ statusCode: 500, statusMessage: 'Could not load logs' })
  }
  return data ?? []
})