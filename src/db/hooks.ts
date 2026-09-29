import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { accountBalances } from '@/core/balances'
import { todayISO } from '@/core/dates'
import { buildMovements, type Movement } from '@/core/movements'
import { spendingItems, type SpendingItem } from '@/core/budgets'
import type { Account, Budget, Card, Category, Recurring, Settings } from '@/core/types'
import { db } from './db'

/** Hooks de lectura reactivos (se actualizan solos cuando cambia la base). */

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('main'))
}

export function useCategories(kind: 'expense' | 'income'): Category[] | undefined {
  return useLiveQuery(() => db.categories.where('kind').equals(kind).sortBy('order'), [kind])
}

export function useCategoryMap(): Map<string, Category> | undefined {
  return useLiveQuery(async () => new Map((await db.categories.toArray()).map((c) => [c.id, c])))
}

export function useAccounts(includeArchived = false): Account[] | undefined {
  return useLiveQuery(async () => {
    const all = (await db.accounts.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return includeArchived ? all : all.filter((a) => !a.archived)
  }, [includeArchived])
}

export function useAllCards(): Card[] | undefined {
  return useLiveQuery(async () => (await db.cards.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
}

/** Saldo actual (hasta hoy) de cada cuenta, calculado desde los movimientos. */
export function useAccountBalances(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const [accounts, expenses, incomes, transfers, cardPayments, goalEntries] = await Promise.all([
      db.accounts.toArray(), db.expenses.toArray(), db.incomes.toArray(), db.transfers.toArray(), db.cardPayments.toArray(), db.goalEntries.toArray(),
    ])
    return accountBalances({ accounts, expenses, incomes, transfers, cardPayments, goalEntries, asOf: todayISO() })
  })
}

/** Lista unificada de todos los movimientos, más reciente primero. */
export function useMovements(): Movement[] | undefined {
  return useLiveQuery(async () => {
    const [expenses, incomes, transfers, purchases, cardPayments, categories, accounts, cards] = await Promise.all([
      db.expenses.toArray(), db.incomes.toArray(), db.transfers.toArray(), db.purchases.toArray(), db.cardPayments.toArray(),
      db.categories.toArray(), db.accounts.toArray(), db.cards.toArray(),
    ])
    const cat = new Map(categories.map((c) => [c.id, c.name]))
    const acc = new Map(accounts.map((a) => [a.id, { name: a.name, currency: a.currency }]))
    const crd = new Map(cards.map((c) => [c.id, `${c.name} •${c.last4}`]))
    return buildMovements(
      { expenses, incomes, transfers, purchases, cardPayments },
      { category: (id) => cat.get(id), account: (id) => acc.get(id), card: (id) => crd.get(id) },
    )
  })
}

export function useRecurring(): Recurring[] | undefined {
  return useLiveQuery(async () => (await db.recurring.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'es')))
}

export function useBudgets(): Budget[] | undefined {
  return useLiveQuery(() => db.budgets.toArray())
}

/** Consumos imputables a presupuestos (gastos + cuotas de tarjeta por mes). */
export function useSpendingItems(): SpendingItem[] | undefined {
  const data = useLiveQuery(async () => {
    const [expenses, purchases, installments] = await Promise.all([db.expenses.toArray(), db.purchases.toArray(), db.installments.toArray()])
    return { expenses, purchases, installments }
  })
  return useMemo(() => (data ? spendingItems(data) : undefined), [data])
}
