import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { spendingForMonth, spendingItems } from '@/core/budgets'
import { addPeriods, periodOf, todayISO } from '@/core/dates'
import { projectCommitments } from '@/core/projection'
import { categoryBreakdown, change, incomeByMonth, lastMonths, savingsRate, spendingByMonth, type CategorySlice, type Change } from '@/core/stats'
import type { Period } from '@/core/types'
import { db, toOverrideMap } from '@/db'

export const MAX_CARD_SERIES = 8

export interface Stats {
  month: Period
  spent: number
  income: number
  spentChange: Change
  rate: number | null
  unconvertedUSD: number
  categories: CategorySlice[]
  /** Últimos 6 meses terminando en el mes elegido. */
  trend: { month: Period; spent: number; income: number }[]
  /** Próximos 12 resúmenes, por tarjeta (en pesos). */
  commitments: { period: Period; total: number; byCard: Record<string, number> }[]
  /** Tarjetas en orden fijo (por fecha de alta): el color sigue a la tarjeta, no a su tamaño. */
  cards: { id: string; label: string; slot: number }[]
  usdInCommitmentsUnconverted: boolean
}

export function useStats(month: Period): Stats | undefined {
  const data = useLiveQuery(async () => {
    const [expenses, purchases, installments, incomes, categories, cards, overrides, recurring, settings] = await Promise.all([
      db.expenses.toArray(), db.purchases.toArray(), db.installments.toArray(), db.incomes.toArray(), db.categories.toArray(),
      db.cards.toArray(), db.statementOverrides.toArray(), db.recurring.toArray(), db.settings.get('main'),
    ])
    return { expenses, purchases, installments, incomes, categories, cards, overrides, recurring, settings }
  })

  return useMemo(() => {
    if (!data) return undefined
    const usdRate = data.settings?.usdRate ?? 0
    const items = spendingItems(data)
    const months = lastMonths(month, 6)
    const spentSeries = spendingByMonth(items, months, usdRate)
    const incomeSeries = incomeByMonth(data.incomes, months, usdRate)
    const current = spendingForMonth(items, month, usdRate)
    const previous = spendingForMonth(items, addPeriods(month, -1), usdRate)
    const income = incomeSeries[incomeSeries.length - 1]?.total ?? 0

    const orderedCards = [...data.cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const cards = orderedCards.map((c, i) => ({ id: c.id, label: `${c.name} •${c.last4}`, slot: Math.min(i + 1, MAX_CARD_SERIES) }))
    const overridesFor = (cardId: string) => {
      const rows = data.overrides.filter((o) => o.cardId === cardId)
      return rows.length ? toOverrideMap(rows) : undefined
    }
    const today = todayISO()
    const projection = projectCommitments({
      cards: orderedCards,
      installments: data.installments.filter((i) => i.status === 'pending'),
      recurring: data.recurring
        .filter((r) => r.method === 'card' && r.cardId && r.kind === 'expense')
        .map((r) => ({ ...r, cardId: r.cardId! })),
      fromPeriod: periodOf(today),
      months: 12,
      today,
      overridesFor,
    })
    let usdUnconverted = false
    const commitments = projection.map((row) => {
      const byCard: Record<string, number> = {}
      let total = 0
      for (const [cardId, t] of Object.entries(row.byCard)) {
        if (t.USD > 0 && !usdRate) usdUnconverted = true
        const ars = t.ARS + (usdRate ? Math.round((t.USD * usdRate) / 100) : 0)
        byCard[cardId] = ars
        total += ars
      }
      return { period: row.period, total, byCard }
    })

    return {
      month,
      spent: current.total,
      income,
      spentChange: change(current.total, previous.total),
      rate: savingsRate(income, current.total),
      unconvertedUSD: current.unconvertedUSD,
      categories: categoryBreakdown(current, data.categories, 8),
      trend: months.map((m, i) => ({ month: m, spent: spentSeries[i]!.total, income: incomeSeries[i]!.total })),
      commitments,
      cards,
      usdInCommitmentsUnconverted: usdUnconverted,
    }
  }, [data, month])
}
