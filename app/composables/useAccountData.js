// File: app/composables/useAccountData.js
//
// G7 — client helper for the "your data" account actions. Mirrors
// useFiringExport's download mechanics, but for the whole-account JSON.

export function useAccountData() {
  // Fetch the full export bundle and download it as a JSON file.
  async function exportAllData() {
    const bundle = await $fetch('/api/account/export')
    const json = JSON.stringify(bundle, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `kilnmonitor-data-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  // Permanently delete the account. Requires the literal string 'DELETE'.
  async function deleteAccount(confirmText) {
    return $fetch('/api/account/delete', {
      method: 'POST',
      body: { confirm: confirmText },
    })
  }

  return { exportAllData, deleteAccount }
}