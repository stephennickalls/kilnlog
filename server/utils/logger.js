// server/utils/logger.js
// Structured logger for Netlify Functions.
// Outputs JSON lines — readable in Netlify log UI and parseable by any log drain.
// Usage: logger.info('event', { key: value })
//        logger.warn('event', { key: value })
//        logger.error('event', { key: value, err })

function write(level, event, meta = {}) {
  const { err, ...rest } = meta
  const entry = {
    ts:    new Date().toISOString(),
    level,
    event,
    ...rest,
    ...(err ? { error: err?.message ?? String(err), stack: err?.stack } : {}),
  }
  // console.error for warn/error so Netlify flags them in the UI
  const fn = level === 'info' ? console.log : console.error
  fn(JSON.stringify(entry))
}

export const logger = {
  info:  (event, meta) => write('info',  event, meta),
  warn:  (event, meta) => write('warn',  event, meta),
  error: (event, meta) => write('error', event, meta),
}