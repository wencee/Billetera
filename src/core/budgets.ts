import { addPeriods, periodOf } from './dates'
import type { Cents, Currency, Period } from './types'

export type BudgetLevel = 'ok' | 'warning' | 'over'

/** Umbrales de alerta: 80 % avisa, 100 % se pasó. */
export const BUDGET_WARNING = 0.8

export function budgetLevel(spent: Cents, limit: Cents): BudgetLevel {
  if (limit <= 0) return spent > 0 ? 'over' : 'ok'
  const pct = spent / limit
  if (pct >= 1) return 'over'
  if (pct >= BUDGET_WARNING) return 'warning'
  return 'ok'
}

/** Un consumo imputado a una categoría y un mes. */
export interface SpendingItem {
  categoryId: string
  month: Period
  amount: Cents
  currency: Currency
}

/**
 * Consumos del presupuesto:
 * - Gastos variables: en el mes de su fecha.
 * - Compras con tarjeta: cada cuota en su mes, contando desde el mes de la
 *   compra (cuota 1 en el mes de compra, cuota 2 en el siguiente…). Así una
 *   heladera en 12 cuotas no se come el presupuesto de un solo mes.
 */
export function spendingItems(params: {
  expenses: readonly { categoryId: string; date: string; amount: Cents; currency: Currency }[]
  purchases: readonly { id: string; categoryId: string; date: string }[]
  installments: readonly { purchaseId: string; number: number; amount: Cents; currency: Currency }[]
}): SpendingItem[] {
  const out: SpendingItem[] = []
  for (const e of params.expenses) {
    out.push({ categoryId: e.categoryId, month: periodOf(e.date), amount: e.amount, currency: e.currency })
  }
  const purchases = new Map(params.purchases.map((p) => [p.id, p]))
  for (const i of params.installments) {
    const p = purchases.get(i.purchaseId)
    if (!p) continue
    out.push({ categoryId: p.categoryId, month: addPeriods(periodOf(p.date), i.number - 1), amount: i.amount, currency: i.currency })
  }
  return out
}

export interface MonthSpending {
  /** Gastado por categoría, en ARS (USD convertido a la cotización). */
  byCategory: Map<string, Cents>
  total: Cents
  /** USD que no se pudo convertir por falta de cotización. */
  unconvertedUSD: Cents
}

export function spendingForMonth(items: readonly SpendingItem[], month: Period, usdRate: Cents = 0): MonthSpending {
  const byCategory = new Map<string, Cents>()
  let total = 0
  let unconvertedUSD = 0
  for (const item of items) {
    if (item.month !== month) continue
    let amount = item.amount
    if (item.currency === 'USD') {
      if (usdRate > 0) amount = Math.round((item.amount * usdRate) / 100)
      else {
        unconvertedUSD += item.amount
        continue
      }
    }
    byCategory.set(item.categoryId, (byCategory.get(item.categoryId) ?? 0) + amount)
    total += amount
  }
  return { byCategory, total, unconvertedUSD }
}

export interface BudgetRow {
  categoryId: string
  limit: Cents
  spent: Cents
  remaining: Cents
  pct: number
  level: BudgetLevel
}

export function budgetRows(budgets: readonly { categoryId: string; monthlyLimit: Cents }[], spending: MonthSpending): BudgetRow[] {
  return budgets.map((b) => {
    const spent = spending.byCategory.get(b.categoryId) ?? 0
    return {
      categoryId: b.categoryId,
      limit: b.monthlyLimit,
      spent,
      remaining: b.monthlyLimit - spent,
      pct: b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0,
      level: budgetLevel(spent, b.monthlyLimit),
    }
  })
}
