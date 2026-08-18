// File: server/utils/conePack.js
// Validates a client-supplied cone pack against the cones table. Returns the
// pack sorted cold-to-hot by temp_c, deduped. Unknown names are dropped, not
// errors: the pack is presentation priority, never a gate.
// Nitro auto-imports server/utils exports.

const MAX_PACK = 12

export async function sanitizeConePack(db, input) {
  if (!Array.isArray(input) || !input.length) return []

  const names = [...new Set(
    input.filter(c => typeof c === 'string').map(c => c.trim()).filter(c => c && c.length <= 8)
  )].slice(0, MAX_PACK)
  if (!names.length) return []

  const { data } = await db
    .from('cones')
    .select('name, temp_c')
    .in('name', names)

  return (data ?? [])
    .sort((a, b) => (a.temp_c ?? 0) - (b.temp_c ?? 0))
    .map(c => c.name)
}