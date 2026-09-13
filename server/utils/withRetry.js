// server/utils/withRetry.js
//
// Retry a Supabase query once (default) on transient gateway failures.
// The Sep 2026 timeouts (beta.slots_settings_failed, firings.autoend.query_failed)
// were single 504s on trivial queries, both after idle periods. One short
// retry covers a cold pooler without masking real errors.
//
// Usage:
//   const { data, error } = await withRetry(() =>
//     db.from('app_settings').select('beta_max_slots').single())

const TRANSIENT = /gateway timeout|bad gateway|service unavailable|ECONNRESET|ETIMEDOUT|fetch failed/i

export async function withRetry(fn, { retries = 1, delayMs = 400 } = {}) {
  let attempt = 0
  while (true) {
    const res = await fn()
    const msg = res?.error?.message ?? ''
    if (!res?.error || !TRANSIENT.test(msg) || attempt >= retries) return res
    attempt++
    await new Promise(r => setTimeout(r, delayMs * attempt))
  }
}