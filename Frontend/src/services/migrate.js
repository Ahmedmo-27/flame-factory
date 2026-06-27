/**
 * One-time migration: moves data stored under the old flat keys
 * (fa_members, fa_attendance, fa_comments, fa_payments) into the
 * new namespaced keys used by the multi-system store
 * (fa_fitacademy_members, etc.).
 *
 * Runs once; sets a flag so it never runs again.
 */

const MIGRATION_KEY = 'fa_migrated_v1'

const OLD_TO_NEW = {
  fa_members:    'fa_fitacademy_members',
  fa_attendance: 'fa_fitacademy_attendance',
  fa_comments:   'fa_fitacademy_comments',
  fa_payments:   'fa_fitacademy_payments',
}

export function runMigration() {
  if (localStorage.getItem(MIGRATION_KEY)) return   // already done

  let migrated = false

  Object.entries(OLD_TO_NEW).forEach(([oldKey, newKey]) => {
    const oldData = localStorage.getItem(oldKey)
    if (!oldData) return

    // Only copy if the new key doesn't already have data
    const newData = localStorage.getItem(newKey)
    if (!newData || newData === '[]') {
      localStorage.setItem(newKey, oldData)
      migrated = true
    }
  })

  // Mark migration as done regardless, so we don't re-run
  localStorage.setItem(MIGRATION_KEY, '1')

  if (migrated) {
    console.log('[FitAcademy] Data migrated to namespaced keys.')
  }
}
