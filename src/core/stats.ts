import { addPeriods } from './dates'
import type { MonthSpending, SpendingItem } from './budgets'
import type { Cents, Currency, ISODate, Period } from './types'

/** Los `n` meses que terminan en `month`, del más viejo al más nuevo. */
export function lastMonths(month: Period, n: number): Period[] {
  return Array.from({ length: n }, (_, i) => addPeriods(month, i - n + 1))
}

function toARS(amount: Cents, currency: Currency, usdRate: Cents): Cents | null {
  if (currency === 'ARS') return amount
  return usdRate > 0 ? Math.round((amount * usdRate) / 100) : null
}

export interface MonthTotal {
  month: Period
  total: Cents
}

/** Gasto total por mes (misma regla que los presupuestos: cuotas repartidas). */
export function spendingByMonth(items: readonly SpendingItem[], months: readonly Period[], usdRate: Cents = 0): MonthTotal[] {
  const totals = new Map(months.map((m) => [m, 0]))
  for (const i of items) {
    if (!totals.has(i.month)) continue
    const v = toARS(i.amount, i.currency, usdRate)
    if (v !== null) totals.set(i.month, totals.get(i.month)! + v)
  }
  return months.map((month) => ({ month, total: totals.get(month)! }))
}

export function incomeByMonth(incomes: readonly { amount: Cents; currency: Currency; date: ISODate }[], months: readonly Period[], usdRate: Cents = 0): MonthTotal[] {
  const totals = new Map(months.map((m) => [m, 0]))
  for (const i of incomes) {
    const month = i.date.slice(0, 7)
    if (!totals.has(month)) continue
    const v = toARS(i.amount, i.currency, usdRate)
    if (v !== null) totals.set(month, totals.get(month)! + v)
  }
  return months.map((month) => ({ month, total: totals.get(month)! }))
}

export interface CategorySlice {
  /** 'other' agrupa la cola. */
  categoryId: string
  name: string
  icon: string
  amount: Cents
  /** Fracción del total del mes. */
  pct: number
}

/**
 * Gasto por categoría ordenado de mayor a menor. Si hay más de `maxRows`,
 * las chicas se agrupan en "Otras" (nunca más de `maxRows` filas).
 */
export function categoryBreakdown(
  spending: Pick<MonthSpending, 'byCategory' | 'total'>,
  categories: readonly { id: string; name: string; icon: string }[],
  maxRows = 8,
): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const rows = [...spending.byCategory.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ categoryId: id, name: byId.get(id)?.name ?? 'Sin categoría', icon: byId.get(id)?.icon ?? '📦', amount, pct: spending.total > 0 ? amount / spending.total : 0 }))
    .sort((a, b) => b.amount - a.amount)
  if (rows.length <= maxRows) return rows
  const head = rows.slice(0, maxRows - 1)
  const tail = rows.slice(maxRows - 1)
  const amount = tail.reduce((s, r) => s + r.amount, 0)
  return [...head, { categoryId: 'other', name: `Otras (${tail.length})`, icon: '···', amount, pct: spending.total > 0 ? amount / spending.total : 0 }]
}

export interface Change {
  delta: Cents
  /** null si el valor anterior era 0. */
  pct: number | null
}

export function change(current: Cents, previous: Cents): Change {
  return { delta: current - previous, pct: previous !== 0 ? (current - previous) / Math.abs(previous) : null }
}

/** Qué parte de lo que entró quedó (ingresos − gastos) / ingresos; null sin ingresos. */
export function savingsRate(income: Cents, spent: Cents): number | null {
  return income > 0 ? (income - spent) / income : null
}

export function average(values: readonly number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}
