import { describe, expect, it } from 'vitest'
import { BACKUP_TABLES, backupCounts, backupFileName, buildBackup, diffBackup, parseBackup, type BackupData } from './backup'
import type { Settings } from './types'

const empty = Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as BackupData

const data: BackupData = {
  ...empty,
  accounts: [{ id: 'a1', name: 'Efectivo', type: 'cash', currency: 'ARS', initialBalance: 1000, archived: false, createdAt: '2026-09-01T10:00:00.000Z' }],
  cards: [{ id: 'c1', name: 'Visa', bank: 'Galicia', network: 'visa', last4: '4321', color: '#1d4ed8', limit: 100000, closingDay: 28, dueDay: 10, currencies: ['ARS'], archived: false, createdAt: '2026-09-01T10:00:00.000Z' }],
  expenses: [{ id: 'e1', amount: 500, currency: 'ARS', categoryId: 'cat', date: '2026-09-10', method: 'cash', accountId: 'a1', note: 'Café', createdAt: '2026-09-10T10:00:00.000Z' }],
}

const settings: Settings = { id: 'main', usdRate: 145000, usdRateDate: '2026-09-20', alertDaysAhead: 3, pinHash: 'secreto', pinSalt: 'sal', privateMode: true, lastBackupAt: '2026-09-01T00:00:00Z', sampleDataLoaded: false }

describe('buildBackup y parseBackup', () => {
  it('ida y vuelta por JSON sin perder nada', () => {
    const backup = buildBackup(data, settings, '2026-09-28T12:00:00.000Z', '0.6.0')
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.backup.data.expenses).toEqual(data.expenses)
      expect(parsed.backup.data.cards).toEqual(data.cards)
      expect(parsed.backup.appVersion).toBe('0.6.0')
      expect(backupCounts(parsed.backup)).toMatchObject({ accounts: 1, cards: 1, expenses: 1, purchases: 0 })
    }
  })

  it('el PIN nunca viaja en el backup', () => {
    const json = JSON.stringify(buildBackup(data, settings, '2026-09-28T12:00:00.000Z'))
    expect(json).not.toContain('secreto')
    expect(json).not.toContain('pinSalt')
    expect(json).not.toContain('lastBackupAt')
  })

  it('tablas que faltan cuentan como vacías y las claves desconocidas se descartan', () => {
    const raw = { format: 'billetera-backup', version: 1, exportedAt: 'x', data: { accounts: [{ ...data.accounts[0], hackeo: '<script>' }] } }
    const parsed = parseBackup(JSON.stringify(raw))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.backup.data.cards).toEqual([])
      expect(parsed.backup.data.accounts[0]).not.toHaveProperty('hackeo')
    }
  })

  it('errores claros', () => {
    expect(parseBackup('no es json')).toEqual({ ok: false, error: 'El archivo no es un JSON válido.' })
    expect(parseBackup('{"a":1}')).toEqual({ ok: false, error: 'Este archivo no es un backup de Billetera.' })
    expect(parseBackup(JSON.stringify({ format: 'billetera-backup', version: 99, exportedAt: 'x', data: {} })).ok).toBe(false)
    const bad = buildBackup({ ...data, cards: [{ ...data.cards[0]!, last4: '4111111111111111' }] }, undefined, 'x')
    const r = parseBackup(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/^Hay un dato inválido en Tarjetas, fila 1, campo "last4"/)
    const money = buildBackup({ ...data, expenses: [{ ...data.expenses[0]!, amount: 10.5 }] }, undefined, 'x')
    expect(parseBackup(JSON.stringify(money)).ok).toBe(false)
  })

  it('rechaza ids repetidos', () => {
    const dup = buildBackup({ ...data, expenses: [data.expenses[0]!, data.expenses[0]!] }, undefined, 'x')
    expect(parseBackup(JSON.stringify(dup))).toEqual({ ok: false, error: 'Hay un id repetido en Gastos.' })
  })
})

describe('diffBackup', () => {
  it('cuenta lo que se agrega y lo que se pisa al fusionar', () => {
    const backup = buildBackup({ ...data, expenses: [data.expenses[0]!, { ...data.expenses[0]!, id: 'e2' }] }, undefined, 'x')
    const existing = Object.fromEntries(BACKUP_TABLES.map((t) => [t, new Set<string>()])) as Record<(typeof BACKUP_TABLES)[number], Set<string>>
    existing.expenses = new Set(['e1', 'otro'])
    const diff = diffBackup(backup, existing)
    expect(diff.expenses).toEqual({ added: 1, updated: 1 })
    expect(diff.accounts).toEqual({ added: 1, updated: 0 })
  })
  it('nombre de archivo', () => {
    expect(backupFileName('2026-09-28')).toBe('billetera-backup-2026-09-28.json')
  })
})
