// File: server/api/admin/announcements/[id].put.js
// PUT /api/admin/announcements/:id — edit fields and/or flip the kill switch.
// Body: any of { title, message, link_url, starts_at, ends_at, active }.
// Editing does NOT reset dismissals (by design — typo fixes shouldn't re-nag;
// to re-notify everyone, stop this one and create a new banner).
const MAX_TITLE = 120
const MAX_MESSAGE = 500
const MAX_URL = 500

export default defineEventHandler(async (event) => {
  const { db, user, profile } = await useServerUser(event, { requireSubscription: false })
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody(event) ?? {}
  const patch = {}

  if (body.title !== undefined)   patch.title = body.title?.trim() ? String(body.title).trim().slice(0, MAX_TITLE) : null
  if (body.link_url !== undefined) patch.link_url = body.link_url?.trim() ? String(body.link_url).trim().slice(0, MAX_URL) : null
  if (body.message !== undefined) {
    const m = String(body.message).trim()
    if (!m || m.length > MAX_MESSAGE) throw createError({ statusCode: 400, statusMessage: 'Message is required (max 500 chars)' })
    patch.message = m
  }
  if (body.active !== undefined) patch.active = !!body.active
  if (body.starts_at !== undefined) {
    const d = new Date(body.starts_at)
    if (isNaN(d.getTime())) throw createError({ statusCode: 400, statusMessage: 'Invalid start date' })
    patch.starts_at = d.toISOString()
  }
  if (body.ends_at !== undefined) {
    const d = new Date(body.ends_at)
    if (isNaN(d.getTime())) throw createError({ statusCode: 400, statusMessage: 'Invalid end date' })
    patch.ends_at = d.toISOString()
  }
  if (!Object.keys(patch).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })

  const { data, error } = await db
    .from('announcements')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw await serverError('announcements.admin.update_failed', error, { userId: user.id, id })
  if (data && data.ends_at && data.starts_at && new Date(data.ends_at) <= new Date(data.starts_at)) {
    // Window ended up inverted after a partial edit — reject clearly.
    throw createError({ statusCode: 400, statusMessage: 'End must be after start' })
  }
  return data
})