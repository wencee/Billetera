import { addDays, diffDays, parseISODate } from './dates'
import { formatDate, formatDateShort, formatMoney } from './format'
import type { BudgetRow } from './budgets'
import type { StatementSummary } from './statements'
import type { Cents, Currency, ISODate, Period } from './types'

export type AlertLevel = 'danger' | 'warning' | 'info'

export type AlertKind =
  | 'cardOverdue' | 'cardDue' | 'cardClosing'
  | 'budgetOver' | 'budgetWarning'
  | 'goalSoon' | 'goalOverdue'
  | 'fixedTermMatured' | 'fixedTermMaturing'
  | 'backup' | 'usdRateStale'

export type AlertTarget =
  | { type: 'statement'; cardId: string; period: Period }
  | { type: 'budgets' }
  | { type: 'goal'; id: string }
  | { type: 'investment'; id: string }
  | { type: 'settings' }

export interface Alert {
  id: string
  kind: AlertKind
  level: AlertLevel
  title: string
  detail: string
  /** Fecha relevante (vencimiento, cierre…) para ordenar. */
  date?: ISODate
  target: AlertTarget
}

export interface AlertCard {
  id: string
  label: string
  /** Resumen abierto (el próximo en cerrar). */
  current: StatementSummary
  /** Resúmenes cerrados recientes (para vencimientos y deudas). */
  closed: readonly StatementSummary[]
  usdRate?: Cents
}

export interface AlertInput {
  today: ISODate
  daysAhead: number
  cards: readonly AlertCard[]
  budgets: readonly (BudgetRow & { name: string; icon: string })[]
  goals: readonly { id: string; name: string; emoji: string; currency: Currency; targetDate?: ISODate | undefined; done: boolean; remaining: Cents; archived: boolean }[]
  investments: readonly { id: string; name: string; maturityDate?: ISODate | undefined; closed: boolean }[]
  backup?: { enabled: boolean; lastBackupAt?: string | undefined; hasData: boolean }
  usd?: { rate: Cents; date?: ISODate | undefined; inUse: boolean }
  /** Modo privado: los montos de los avisos se tapan. */
  hide?: boolean
}

const LEVEL_ORDER: Record<AlertLevel, number> = { danger: 0, warning: 1, info: 2 }

function inDays(n: number): string {
  if (n === 0) return 'hoy'
  if (n === 1) return 'mañana'
  return `en ${n} días`
}

function capitalize(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function statementARS(s: StatementSummary, usdRate = 0): Cents {
  return s.totals.ARS + (usdRate > 0 ? Math.round((s.totals.USD * usdRate) / 100) : 0)
}

/** Avisos para Inicio (y el número del ícono), ordenados por gravedad y fecha. */
export function buildAlerts(input: AlertInput): Alert[] {
  const { today, daysAhead } = input
  const money = (c: Cents, currency: Currency, digits: 0 | 2 = 0) => formatMoney(c, currency, { fractionDigits: digits, hide: input.hide ?? false })
  const horizon = addDays(today, daysAhead)
  const out: Alert[] = []

  for (const card of input.cards) {
    for (const s of card.closed) {
      if (s.payment.status === 'paid' || s.count === 0) continue
      const owed = s.payment.remaining > 0 ? s.payment.remaining : statementARS(s, card.usdRate)
      const target: AlertTarget = { type: 'statement', cardId: card.id, period: s.period }
      if (s.dueDate < today && diffDays(s.dueDate, today) <= 45) {
        out.push({
          id: `cardOverdue:${card.id}:${s.period}`, kind: 'cardOverdue', level: 'danger', date: s.dueDate, target,
          title: `Resumen de ${card.label} vencido`,
          detail: `Venció el ${formatDate(s.dueDate)} · ${s.payment.status === 'unpaid' ? 'sin pagar' : `faltan ${money(owed, 'ARS')}`}`,
        })
      } else if (s.dueDate >= today && s.dueDate <= horizon) {
        out.push({
          id: `cardDue:${card.id}:${s.period}`, kind: 'cardDue', level: 'warning', date: s.dueDate, target,
          title: `Vence el resumen de ${card.label}`,
          detail: `${capitalize(inDays(diffDays(today, s.dueDate)))} (${formatDateShort(s.dueDate)}) · ${money(owed, 'ARS')}${s.totals.USD > 0 && !card.usdRate ? ` + ${money(s.totals.USD, 'USD', 2)}` : ''}`,
        })
      }
    }
    const c = card.current
    if (c.count > 0 && c.closingDate >= today && c.closingDate <= horizon) {
      out.push({
        id: `cardClosing:${card.id}:${c.period}`, kind: 'cardClosing', level: 'info', date: c.closingDate,
        target: { type: 'statement', cardId: card.id, period: c.period },
        title: `${card.label} cierra ${inDays(diffDays(today, c.closingDate))}`,
        detail: `Cierre ${formatDateShort(c.closingDate)} · lleva ${money(statementARS(c, card.usdRate), 'ARS')}`,
      })
    }
  }

  for (const b of input.budgets) {
    if (b.level === 'over') {
      out.push({
        id: `budgetOver:${b.categoryId}`, kind: 'budgetOver', level: 'danger', target: { type: 'budgets' },
        title: `${b.icon} ${b.name}: te pasaste del presupuesto`,
        detail: `${money(b.spent, 'ARS')} de ${money(b.limit, 'ARS')} (${Math.round(b.pct * 100)} %)`,
      })
    } else if (b.level === 'warning') {
      out.push({
        id: `budgetWarning:${b.categoryId}`, kind: 'budgetWarning', level: 'warning', target: { type: 'budgets' },
        title: `${b.icon} ${b.name} al ${Math.round(b.pct * 100)} % del presupuesto`,
        detail: `Quedan ${money(b.remaining, 'ARS')} este mes`,
      })
    }
  }

  for (const g of input.goals) {
    if (g.archived || g.done || !g.targetDate) continue
    const days = diffDays(today, g.targetDate)
    if (days < 0 && days >= -60) {
      out.push({
        id: `goalOverdue:${g.id}`, kind: 'goalOverdue', level: 'info', date: g.targetDate, target: { type: 'goal', id: g.id },
        title: `${g.emoji} ${g.name}: la fecha ya pasó`,
        detail: `Faltan ${money(g.remaining, g.currency)}. Podés mover la fecha.`,
      })
    } else if (days >= 0 && days <= 30) {
      out.push({
        id: `goalSoon:${g.id}`, kind: 'goalSoon', level: 'warning', date: g.targetDate, target: { type: 'goal', id: g.id },
        title: `${g.emoji} ${g.name}: ${days === 0 ? 'es hoy' : `faltan ${days} ${days === 1 ? 'día' : 'días'}`}`,
        detail: `Te faltan ${money(g.remaining, g.currency)}`,
      })
    }
  }

  for (const inv of input.investments) {
    if (inv.closed || !inv.maturityDate) continue
    const days = diffDays(today, inv.maturityDate)
    if (days < 0) {
      out.push({
        id: `fixedTermMatured:${inv.id}`, kind: 'fixedTermMatured', level: 'warning', date: inv.maturityDate, target: { type: 'investment', id: inv.id },
        title: `${inv.name} ya venció`,
        detail: 'Registrá el cobro o renovalo',
      })
    } else if (days <= daysAhead) {
      out.push({
        id: `fixedTermMaturing:${inv.id}`, kind: 'fixedTermMaturing', level: 'info', date: inv.maturityDate, target: { type: 'investment', id: inv.id },
        title: `${inv.name} vence ${inDays(days)}`,
        detail: formatDate(inv.maturityDate),
      })
    }
  }

  if (input.backup?.enabled && input.backup.hasData) {
    const last = input.backup.lastBackupAt
    const days = last ? Math.floor((parseISODate(today).getTime() - new Date(last).getTime()) / 86_400_000) : null
    if (days === null || days > 7) {
      out.push({
        id: 'backup', kind: 'backup', level: 'warning', target: { type: 'settings' },
        title: 'Hacé un backup',
        detail: days === null ? 'Nunca hiciste uno: tus datos están solo en este teléfono' : `El último fue hace ${days} días`,
      })
    }
  }

  if (input.usd && input.usd.inUse && input.usd.rate > 0 && input.usd.date && diffDays(input.usd.date, today) > 14) {
    out.push({
      id: 'usdRateStale', kind: 'usdRateStale', level: 'info', target: { type: 'settings' },
      title: 'Actualizá la cotización del dólar',
      detail: `La cargaste hace ${diffDays(input.usd.date, today)} días`,
    })
  }

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || (a.date ?? '9999').localeCompare(b.date ?? '9999'))
}

/** Número para el ícono de la app: solo lo que pide acción (peligro y advertencias). */
export function badgeCount(alerts: readonly Alert[]): number {
  return alerts.filter((a) => a.level !== 'info').length
}
