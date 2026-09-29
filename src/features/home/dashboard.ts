import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { buildAlerts, type Alert, type AlertCard } from '@/core/alerts'
import { budgetRows, spendingForMonth, spendingItems, type BudgetRow } from '@/core/budgets'
import { addPeriods, periodOf, todayISO } from '@/core/dates'
import { summarizeGoal, type GoalSummary } from '@/core/goals'
import { monthOverview, type MonthOverview } from '@/core/overview'
import { currentPeriod, statementsDueInMonth, statementTotalARS, summarizeStatement, type StatementSummary } from '@/core/statements'
import type { Category, Goal } from '@/core/types'
import { db, toOverrideMap } from '@/db'

export interface Dashboard {
  month: string
  overview: MonthOverview
  alerts: Alert[]
  budget: { rows: (BudgetRow & { category: Category | undefined })[]; spent: number; limit: number }
  goals: { goal: Goal; summary: GoalSummary }[]
  /** Resúmenes que vencen este mes, por tarjeta (para el detalle de "Tarjetas"). */
  cardsDue: { cardId: string; label: string; statement: StatementSummary; amountARS: number }[]
}

/** Lee todo lo necesario para Inicio y los avisos, y lo mantiene actualizado. */
function useRawData() {
  return useLiveQuery(async () => {
    const [cards, overrides, installments, payments, incomes, expenses, recurring, budgets, categories, goals, goalEntries, investments, purchases, settings] = await Promise.all([
      db.cards.toArray(), db.statementOverrides.toArray(), db.installments.toArray(), db.cardPayments.toArray(), db.incomes.toArray(),
      db.expenses.toArray(), db.recurring.toArray(), db.budgets.toArray(), db.categories.toArray(), db.goals.toArray(), db.goalEntries.toArray(),
      db.investments.toArray(), db.purchases.toArray(), db.settings.get('main'),
    ])
    return { cards, overrides, installments, payments, incomes, expenses, recurring, budgets, categories, goals, goalEntries, investments, purchases, settings }
  })
}

export function useDashboard(): Dashboard | undefined {
  const data = useRawData()
  const today = todayISO()
  return useMemo(() => {
    if (!data) return undefined
    const month = periodOf(today)
    const usdRate = data.settings?.usdRate ?? 0
    const daysAhead = data.settings?.alertDaysAhead ?? 3

    // Tarjetas: resúmenes abiertos, cerrados recientes y los que vencen este mes.
    const alertCards: AlertCard[] = []
    const cardsDue: Dashboard['cardsDue'] = []
    for (const card of data.cards.filter((c) => !c.archived)) {
      const overrideRows = data.overrides.filter((o) => o.cardId === card.id)
      const overrides = overrideRows.length ? toOverrideMap(overrideRows) : undefined
      const installments = data.installments.filter((i) => i.cardId === card.id)
      const payments = data.payments.filter((p) => p.cardId === card.id)
      const base = { card, installments, payments, today, overrides, ...(usdRate ? { usdRate } : {}) }
      const current = currentPeriod(card, today, overrides)
      const label = `${card.name} •${card.last4}`
      alertCards.push({
        id: card.id, label, ...(usdRate ? { usdRate } : {}),
        current: summarizeStatement({ ...base, period: current }),
        closed: [-2, -1].map((offset) => summarizeStatement({ ...base, period: addPeriods(current, offset) })),
      })
      for (const statement of statementsDueInMonth({ ...base, month })) {
        cardsDue.push({ cardId: card.id, label, statement, amountARS: statementTotalARS(statement, usdRate) })
      }
    }

    const overview = monthOverview({
      month, today, usdRate, incomes: data.incomes, expenses: data.expenses, recurring: data.recurring,
      cardsDue: cardsDue.map((c) => c.amountARS),
    })

    const categoryById = new Map(data.categories.map((c) => [c.id, c]))
    const spending = spendingForMonth(spendingItems(data), month, usdRate)
    const rows = budgetRows(data.budgets, spending)
      .map((r) => ({ ...r, category: categoryById.get(r.categoryId) }))
      .sort((a, b) => b.pct - a.pct)

    const goals = data.goals
      .filter((g) => !g.archived)
      .map((goal) => ({ goal, summary: summarizeGoal(goal, data.goalEntries.filter((e) => e.goalId === goal.id), today) }))

    const hasUSD = data.installments.some((i) => i.currency === 'USD') || data.expenses.some((e) => e.currency === 'USD') || data.investments.some((i) => i.currency === 'USD')
    const alerts = buildAlerts({
      today, daysAhead, cards: alertCards,
      budgets: rows.map((r) => ({ ...r, name: r.category?.name ?? 'Categoría', icon: r.category?.icon ?? '📦' })),
      goals: goals.map(({ goal, summary }) => ({ ...goal, done: summary.done, remaining: summary.remaining })),
      investments: data.investments,
      // El aviso de backup se activa cuando exista la función de backup (fase 6).
      backup: { enabled: false, hasData: data.expenses.length + data.purchases.length > 0, lastBackupAt: data.settings?.lastBackupAt },
      usd: { rate: usdRate, date: data.settings?.usdRateDate, inUse: hasUSD },
    })

    return {
      month, overview, alerts, goals, cardsDue,
      budget: { rows, spent: rows.reduce((s, r) => s + r.spent, 0), limit: rows.reduce((s, r) => s + r.limit, 0) },
    }
  }, [data, today])
}
