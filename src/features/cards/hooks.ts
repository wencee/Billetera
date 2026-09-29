import { useLiveQuery } from 'dexie-react-hooks'
import type { Overrides } from '@/core/statements'
import type { Card, CardPayment, Installment, Purchase, Recurring } from '@/core/types'
import { db, toOverrideMap } from '@/db'

export function useCards(includeArchived = false): Card[] | undefined {
  return useLiveQuery(async () => {
    const all = (await db.cards.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return includeArchived ? all : all.filter((c) => !c.archived)
  }, [includeArchived])
}

export function useCard(id: string | undefined): Card | undefined {
  return useLiveQuery(() => (id ? db.cards.get(id) : undefined), [id])
}

export function useCardOverrides(cardId: string | undefined): Overrides {
  return useLiveQuery(async () => {
    if (!cardId) return undefined
    const rows = await db.statementOverrides.where('cardId').equals(cardId).toArray()
    return rows.length ? toOverrideMap(rows) : undefined
  }, [cardId])
}

export function useCardInstallments(cardId: string | undefined): Installment[] | undefined {
  return useLiveQuery(() => (cardId ? db.installments.where('cardId').equals(cardId).toArray() : []), [cardId])
}

export function useCardPayments(cardId: string | undefined): CardPayment[] | undefined {
  return useLiveQuery(() => (cardId ? db.cardPayments.where('cardId').equals(cardId).toArray() : []), [cardId])
}

export function usePurchasesForCard(cardId: string | undefined): Purchase[] | undefined {
  return useLiveQuery(async () => {
    if (!cardId) return []
    const rows = await db.purchases.where('cardId').equals(cardId).toArray()
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
  }, [cardId])
}

export function usePurchase(id: string | undefined): Purchase | undefined {
  return useLiveQuery(() => (id ? db.purchases.get(id) : undefined), [id])
}

export function usePurchaseInstallments(purchaseId: string | undefined): Installment[] | undefined {
  return useLiveQuery(async () => {
    if (!purchaseId) return []
    const rows = await db.installments.where('purchaseId').equals(purchaseId).toArray()
    return rows.sort((a, b) => a.number - b.number)
  }, [purchaseId])
}

// Hooks compartidos con otras pantallas.
export { useAccounts, useCategories, useSettings } from '@/db/hooks'

export function usePurchasesById(ids: readonly string[]): Map<string, Purchase> | undefined {
  const key = ids.join(',')
  return useLiveQuery(async () => {
    const rows = await db.purchases.bulkGet([...ids])
    return new Map(rows.filter((r): r is Purchase => !!r).map((r) => [r.id, r]))
  }, [key])
}

export function useRecurringOnCard(cardId: string | undefined): Recurring[] | undefined {
  return useLiveQuery(() => (cardId ? db.recurring.where('cardId').equals(cardId).toArray() : []), [cardId])
}
