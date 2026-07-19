// File: server/api/beta-interest.post.js
//
// POST /api/beta-interest — PUBLIC (no auth). Records a beta-tester interest
// signup and fires two best-effort emails via Resend.
//
// Abuse controls (public endpoint, so all of these matter):
//   - honeypot field: bots that fill "website" get a fake 200 and no insert
//   - basic email shape + length caps
//   - per-IP rate limit: max 5 submissions / hour (hashed IP, best-effort)
//   - unique index on lower(email) makes duplicates idempotent (returns ok)
//
// Env vars required:
//   RESEND_API_KEY   — from resend.com (free tier is plenty)
//   BETA_NOTIFY_TO   — your inbox, e.g. you@example.com
//   BETA_FROM        — verified sender, e.g. "KilnMonitor <hello@yourdomain>"
//                      (before domain verification, "onboarding@resend.dev"
//                      works but can only send TO your own account email)
//
// Emails are fire-and-forget AFTER the insert succeeds — an email failure
// must never lose the signup. We await them (Netlify kills unawaited work)
// but swallow errors.

import { createHash } from 'node:crypto'

const MAX_EMAIL   = 254
const MAX_NAME    = 120
const MAX_KILN    = 120
const MAX_MESSAGE = 2000
const RATE_MAX    = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

function bad(msg) { return createError({ statusCode: 400, statusMessage: msg }) }

async function sendEmail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.BETA_FROM || 'onboarding@resend.dev'
  if (!key || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    })
  } catch (err) {
    logger.warn('beta.email_failed', { to, err })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) ?? {}

  // Honeypot — hidden field real users never fill. Pretend success.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return { ok: true }
  }

  // Validate + clamp.
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw bad('Please enter a valid email address')
  }
  const clamp = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : null) || null
  const name     = clamp(body.name, MAX_NAME)
  const kilnType = clamp(body.kilnType, MAX_KILN)
  const message  = clamp(body.message, MAX_MESSAGE)

  const db = serviceClient()  // RLS bypass justified: beta_interest is policy-less by design

  // Per-IP rate limit (best-effort). Hash the IP — we never store it raw.
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || event.node.req.socket?.remoteAddress || 'unknown'
  const ipHash = createHash('sha256').update(ip).digest('hex')
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await db
    .from('beta_interest')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart)
  if ((count ?? 0) >= RATE_MAX) {
    throw createError({ statusCode: 429, statusMessage: 'Too many submissions — please try again later.' })
  }

  // Insert. Duplicate email → treat as success (idempotent, no email resend).
  const { error } = await db.from('beta_interest').insert({
    email, name, kiln_type: kilnType, message, ip_hash: ipHash,
  })
  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true }
    throw await serverError('beta.insert_failed', error, { email })
  }

  // Best-effort emails — awaited (Netlify) but never fatal.
  await Promise.allSettled([
    sendEmail({
      to: process.env.BETA_NOTIFY_TO,
      subject: `🔥 New beta interest: ${email}`,
      text: [
        `Email: ${email}`,
        name     ? `Name: ${name}` : null,
        kilnType ? `Kiln: ${kilnType}` : null,
        message  ? `Message:\n${message}` : null,
      ].filter(Boolean).join('\n'),
    }),
    sendEmail({
      to: email,
      subject: 'Thanks for your interest in the KilnMonitor beta 🔥',
      text: `Hi${name ? ' ' + name : ''},\n\nThanks for registering your interest in the KilnMonitor beta!\n\nWe're selecting a small group of potters to test the app. Chosen testers get 12 months free in exchange for using the app during real firings and sharing feedback.\n\nWe'll be in touch soon.\n\n— KilnMonitor`,
    }),
  ])

  return { ok: true }
})