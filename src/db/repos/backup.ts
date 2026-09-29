import { BACKUP_TABLES, buildBackup, type Backup, type BackupData, type BackupTable } from '@/core/backup'
import { nowISO } from '@/lib/id'
import { db } from '../db'
import { ensureDefaults } from '../seed'
import { generateDueRecurring } from './recurring'

const tables = () => BACKUP_TABLES.map((t) => db.table(t))

export async function readBackupData(): Promise<BackupData> {
  const rows = await Promise.all(BACKUP_TABLES.map((t) => db.table(t).toArray()))
  return Object.fromEntries(BACKUP_TABLES.map((t, i) => [t, rows[i]])) as unknown as BackupData
}

export async function exportBackup(): Promise<Backup> {
  const [data, settings] = await Promise.all([readBackupData(), db.settings.get('main')])
  return buildBackup(data, settings, nowISO(), __APP_VERSION__)
}

export async function existingIds(): Promise<Record<BackupTable, Set<string>>> {
  const keys = await Promise.all(BACKUP_TABLES.map((t) => db.table(t).toCollection().primaryKeys()))
  return Object.fromEntries(BACKUP_TABLES.map((t, i) => [t, new Set(keys[i] as string[])])) as Record<BackupTable, Set<string>>
}

export type ImportMode = 'replace' | 'merge'

/**
 * Importa un backup ya validado, todo en una transacción (si algo falla no
 * queda nada a medias).
 * - replace: borra todo y deja exactamente lo del backup. Ajustes del backup,
 *   pero el PIN y la fecha del último backup de este teléfono se mantienen.
 * - merge: agrega lo nuevo y, si un dato está en los dos (mismo id), gana el
 *   del backup. Los ajustes de este teléfono no se tocan.
 */
export async function importBackup(backup: Backup, mode: ImportMode): Promise<void> {
  await db.transaction('rw', [...tables(), db.settings], async () => {
    for (const t of BACKUP_TABLES) {
      const table = db.table(t)
      const rows = backup.data[t] as unknown[]
      if (mode === 'replace') {
        await table.clear()
        if (rows.length) await table.bulkAdd(rows)
      } else if (rows.length) {
        await table.bulkPut(rows)
      }
    }
    if (mode === 'replace' && backup.data.settings) {
      const current = await db.settings.get('main')
      await db.settings.put({
        ...backup.data.settings,
        id: 'main',
        ...(current?.pinHash ? { pinHash: current.pinHash, pinSalt: current.pinSalt, pinLength: current.pinLength } : {}),
        ...(current?.lastBackupAt ? { lastBackupAt: current.lastBackupAt } : {}),
      })
    }
  })
  await ensureDefaults()
  await generateDueRecurring()
}

export async function markBackupDone(): Promise<void> {
  await db.settings.update('main', { lastBackupAt: nowISO() })
}
