// server/api/demo-firing/index.get.js
//
// GET /api/demo-firing - what the caller needs to decide about a demo: the
// presets they can seed from, whether they already have one, and whether
// anything is currently active.
//
// USER-SCOPED, NOT ADMIN. An earlier version of this file was a copy of an
// admin route, so requireAdmin rejected every ordinary user with "Admin access
// required" and the preset list came back empty. Nothing here needs elevated
// access: presets are built-in rows readable by everyone, and the firings query
// is scoped to the caller.
//
// A demo occupies the one-active-firing slot, so a real firing blocks it and
// vice versa. The caller needs both facts to render an honest button rather
// than one that can only fail.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const [presets, mine] = await Promise.all([
    listDemoPresets(db),
    db.from('firings')
      .select('id, name, is_demo, started_at, ended_at')
      .eq('user_id', user.id)
      .or('is_demo.eq.true,and(ended_at.is.null,started_at.not.is.null)')
      .order('created_at', { ascending: false }),
  ])

  if (mine.error) throw await serverError('demo.state_failed', mine.error, { userId: user.id })

  const rows   = mine.data ?? []
  const demos  = rows.filter(f => f.is_demo)
  const active = rows.find(f => f.started_at && !f.ended_at) ?? null

  return {
    presets,
    demoCount:    demos.length,
    hasDemo:      demos.length > 0,
    activeFiring: active ? { id: active.id, name: active.name, is_demo: active.is_demo } : null,
  }
})