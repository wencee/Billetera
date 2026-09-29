import { z } from 'zod'
import { currencySchema, isoDateSchema, periodSchema } from './schemas'
import type {
  Account, Budget, Card, CardPayment, Category, Expense, Goal, GoalEntry, Income, Installment,
  Investment, Purchase, Recurring, Settings, StatementOverride, Transfer,
} from './types'

/**
 * Formato del backup: un JSON con todas las tablas. Se valida entero con Zod
 * antes de tocar la base: si una sola fila no cierra, no se importa nada.
 * Las claves desconocidas se descartan (Zod las quita por defecto).
 */

export const BACKUP_FORMAT = 'billetera-backup'
export const BACKUP_VERSION = 1

/** Orden de las tablas: el mismo en que se exportan y se importan. */
export const BACKUP_TABLES = [
  'categories', 'accounts', 'cards', 'statementOverrides', 'purchases', 'installments', 'cardPayments',
  'expenses', 'incomes', 'transfers', 'recurring', 'goals', 'goalEntries', 'investments', 'budgets',
] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]

export const TABLE_LABEL: Record<BackupTable, string> = {
  categories: 'Categorías',
  accounts: 'Cuentas',
  cards: 'Tarjetas',
  statementOverrides: 'Fechas de resúmenes',
  purchases: 'Compras con tarjeta',
  installments: 'Cuotas',
  cardPayments: 'Pagos de tarjeta',
  expenses: 'Gastos',
  incomes: 'Ingresos',
  transfers: 'Transferencias',
  recurring: 'Fijos y suscripciones',
  goals: 'Metas',
  goalEntries: 'Aportes a metas',
  investments: 'Inversiones',
  budgets: 'Presupuestos',
}

const id = z.string().min(1).max(100)
const text = (max: number) => z.string().max(max)
const cents = z.number().int().safe()
const timestamp = z.string().min(1).max(40)
const day = z.number().int().min(1).max(31)
const opt = <T extends z.ZodType>(s: T) => s.optional()

const card = z.object({
  id, name: text(80), bank: text(80), network: z.enum(['visa', 'mastercard', 'amex', 'other']),
  // Nunca más que los últimos 4: un número completo hace fallar la importación.
  last4: z.string().regex(/^\d{4}$/), color: text(20), limit: cents, closingDay: day, dueDay: day,
  currencies: z.array(currencySchema).min(1), archived: z.boolean(), createdAt: timestamp,
})
const statementOverride = z.object({ id, cardId: id, period: periodSchema, closingDate: opt(isoDateSchema), dueDate: opt(isoDateSchema) })
const purchase = z.object({
  id, cardId: id, description: text(200), merchant: opt(text(200)), categoryId: id, date: isoDateSchema, currency: currencySchema,
  cashPrice: cents, installments: z.number().int().min(1).max(240), financing: z.enum(['none', 'interest']),
  interestInput: opt(z.object({ mode: z.enum(['installment', 'total', 'tna']), value: z.number().finite() })),
  installmentAmount: cents, totalAmount: cents, firstPeriod: periodSchema, notes: opt(text(1000)), recurringId: opt(id), createdAt: timestamp,
})
const installment = z.object({
  id, purchaseId: id, cardId: id, number: z.number().int().min(1), count: z.number().int().min(1), amount: cents,
  currency: currencySchema, period: periodSchema, dueDate: isoDateSchema, status: z.enum(['pending', 'paid']), paidAt: opt(isoDateSchema),
})
const cardPayment = z.object({
  id, cardId: id, period: periodSchema, amount: cents, kind: z.enum(['total', 'partial', 'minimum']), accountId: opt(id),
  date: isoDateSchema, note: opt(text(500)), createdAt: timestamp,
})
const account = z.object({
  id, name: text(80), type: z.enum(['cash', 'bank', 'wallet']), currency: currencySchema, initialBalance: cents,
  color: opt(text(20)), archived: z.boolean(), createdAt: timestamp,
})
const expense = z.object({
  id, amount: cents, currency: currencySchema, categoryId: id, date: isoDateSchema, method: z.enum(['cash', 'debit', 'transfer', 'wallet']),
  accountId: id, note: opt(text(500)), recurringId: opt(id), createdAt: timestamp,
})
const income = z.object({
  id, amount: cents, currency: currencySchema, date: isoDateSchema, source: text(200), accountId: id, note: opt(text(500)),
  recurringId: opt(id), createdAt: timestamp,
})
const transfer = z.object({
  id, fromAccountId: id, fromAmount: cents, toAccountId: id, toAmount: cents, date: isoDateSchema, note: opt(text(500)), createdAt: timestamp,
})
const recurring = z.object({
  id, kind: z.enum(['expense', 'income']), name: text(200), amount: cents, currency: currencySchema, categoryId: opt(id),
  frequency: z.enum(['weekly', 'monthly', 'yearly']), day: z.number().int().min(0).max(31),
  method: z.enum(['cash', 'debit', 'transfer', 'wallet', 'card']), accountId: opt(id), cardId: opt(id),
  installments: opt(z.number().int().min(1).max(240)), active: z.boolean(), startDate: isoDateSchema, endDate: opt(isoDateSchema),
  lastGeneratedUntil: opt(isoDateSchema), createdAt: timestamp,
})
const goal = z.object({
  id, name: text(80), emoji: text(16), targetAmount: cents, currency: currencySchema, targetDate: opt(isoDateSchema),
  archived: z.boolean(), createdAt: timestamp,
})
const goalEntry = z.object({ id, goalId: id, amount: cents, date: isoDateSchema, accountId: opt(id), note: opt(text(500)), createdAt: timestamp })
const investment = z.object({
  id, type: z.enum(['ars', 'usd', 'plazo_fijo', 'fci', 'crypto', 'other']), name: text(80), amount: cents, currency: currencySchema,
  date: isoDateSchema, tna: opt(z.number().finite()), maturityDate: opt(isoDateSchema), currentValue: opt(cents),
  currentValueDate: opt(isoDateSchema), accountId: opt(id), closed: z.boolean(), closedAt: opt(isoDateSchema),
  closedAmount: opt(cents), closedAccountId: opt(id), renewedFromId: opt(id), notes: opt(text(1000)), createdAt: timestamp,
})
const budget = z.object({ id, categoryId: id, monthlyLimit: cents })
const category = z.object({
  id, name: text(80), icon: text(16), color: text(20), kind: z.enum(['expense', 'income']), order: z.number().int(), isDefault: z.boolean(),
})

/** Ajustes que viajan en el backup. El PIN no: es un candado de este teléfono. */
const settings = z.object({
  usdRate: cents.nonnegative(),
  usdRateDate: opt(isoDateSchema),
  alertDaysAhead: z.number().int().min(0).max(60),
  privateMode: z.boolean(),
  appBadge: opt(z.boolean()),
  sampleDataLoaded: z.boolean(),
})

const tableSchemas = {
  categories: category, accounts: account, cards: card, statementOverrides: statementOverride, purchases: purchase,
  installments: installment, cardPayments: cardPayment, expenses: expense, incomes: income, transfers: transfer,
  recurring, goals: goal, goalEntries: goalEntry, investments: investment, budgets: budget,
} satisfies Record<BackupTable, z.ZodType>

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: timestamp,
  appVersion: opt(text(40)),
  data: z.object({
    ...(Object.fromEntries(BACKUP_TABLES.map((t) => [t, z.array(tableSchemas[t]).default([])])) as { [K in BackupTable]: z.ZodDefault<z.ZodArray<(typeof tableSchemas)[K]>> }),
    settings: opt(settings),
  }),
})

export interface BackupData {
  categories: Category[]
  accounts: Account[]
  cards: Card[]
  statementOverrides: StatementOverride[]
  purchases: Purchase[]
  installments: Installment[]
  cardPayments: CardPayment[]
  expenses: Expense[]
  incomes: Income[]
  transfers: Transfer[]
  recurring: Recurring[]
  goals: Goal[]
  goalEntries: GoalEntry[]
  investments: Investment[]
  budgets: Budget[]
}

export type BackupSettings = Pick<Settings, 'usdRate' | 'usdRateDate' | 'alertDaysAhead' | 'privateMode' | 'appBadge' | 'sampleDataLoaded'>

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appVersion?: string
  data: BackupData & { settings?: BackupSettings }
}

/** Arma el backup a partir de las tablas (sin el PIN). */
export function buildBackup(data: BackupData, settings: Settings | undefined, exportedAt: string, appVersion?: string): Backup {
  const out: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, data: { ...data } }
  if (appVersion) out.appVersion = appVersion
  if (settings) {
    const s: BackupSettings = { usdRate: settings.usdRate, alertDaysAhead: settings.alertDaysAhead, privateMode: settings.privateMode, sampleDataLoaded: settings.sampleDataLoaded }
    if (settings.usdRateDate) s.usdRateDate = settings.usdRateDate
    if (settings.appBadge !== undefined) s.appBadge = settings.appBadge
    out.data.settings = s
  }
  return out
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

/** Lee y valida un backup. El error explica dónde está el problema, en castellano. */
export function parseBackup(textContent: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(textContent)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Este archivo no es un backup de Billetera.' }
  }
  const version = (raw as { version?: unknown }).version
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return { ok: false, error: 'El backup es de una versión más nueva de la app. Actualizá la app y probá de nuevo.' }
  }
  const parsed = backupSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!
    const [root, table, row, field] = issue.path
    const where =
      root === 'data' && typeof table === 'string' && table in TABLE_LABEL
        ? `${TABLE_LABEL[table as BackupTable]}${typeof row === 'number' ? `, fila ${row + 1}` : ''}${field !== undefined ? `, campo "${String(field)}"` : ''}`
        : issue.path.join('.') || 'el archivo'
    return { ok: false, error: `Hay un dato inválido en ${where}: ${issue.message}` }
  }
  const backup = parsed.data as unknown as Backup
  for (const t of BACKUP_TABLES) {
    const ids = new Set<string>()
    for (const row of backup.data[t] as { id: string }[]) {
      if (ids.has(row.id)) return { ok: false, error: `Hay un id repetido en ${TABLE_LABEL[t]}.` }
      ids.add(row.id)
    }
  }
  return { ok: true, backup }
}

export type TableCounts = Record<BackupTable, number>

export function backupCounts(backup: Backup): TableCounts {
  return Object.fromEntries(BACKUP_TABLES.map((t) => [t, backup.data[t].length])) as TableCounts
}

export interface MergeDiff {
  /** Filas del backup que no están en el teléfono. */
  added: number
  /** Filas del backup que reemplazarían a una del teléfono (mismo id). */
  updated: number
}

/** Qué pasaría al fusionar: por tabla, cuántas filas se agregan y cuántas se pisan. */
export function diffBackup(backup: Backup, existingIds: Record<BackupTable, ReadonlySet<string>>): Record<BackupTable, MergeDiff> {
  return Object.fromEntries(
    BACKUP_TABLES.map((t) => {
      let added = 0
      let updated = 0
      for (const row of backup.data[t] as { id: string }[]) {
        if (existingIds[t].has(row.id)) updated++
        else added++
      }
      return [t, { added, updated }]
    }),
  ) as Record<BackupTable, MergeDiff>
}

export function backupFileName(date: string): string {
  return `billetera-backup-${date}.json`
}
