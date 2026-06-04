// server/api/logs/index.get.js
// GET /api/logs — admin-only. Returns recent log rows, newest first.
// Query params: ?level=error|warn|info  ?limit=100  ?before=<ISO>  ?source=server|client
export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)
  const q = getQuery(event)

  const limit = Math.min(Math.max(Number(q.limit) || 100, 1), 500)

  let query = db
    .from('logs')
    .select('id, created_at, level, source, event, message, context, user_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (q.level  && ['info','warn','error'].includes(q.level))   query = query.eq('level', q.level)
  if (q.source && ['server','client'].includes(q.source))       query = query.eq('source', q.source)
  if (q.before)                                                 query = query.lt('created_at', q.before)

  const { data, error } = await query
  if (error) {
    // Use console directly here — don't recurse through logger into the table.
    console.error(JSON.stringify({ level: 'error', event: 'logs.read.failed', error: error.message }))
    throw createError({ statusCode: 500, statusMessage: 'Could not load logs' })
  }
  return data ?? []
})