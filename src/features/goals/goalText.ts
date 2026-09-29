import { periodOf } from '@/core/dates'
import { formatMoney, formatPeriod } from '@/core/format'
import type { GoalSummary } from '@/core/goals'
import type { Currency } from '@/core/types'

/** Color del anillo según el estado. */
export function goalColor(s: Pick<GoalSummary, 'status'>): string {
  switch (s.status) {
    case 'done': return 'var(--color-green)'
    case 'behind':
    case 'overdue': return 'var(--color-orange)'
    default: return 'var(--color-tint)'
  }
}

/** Una línea que dice qué hacer (o qué tan bien vas). */
export function goalHint(s: GoalSummary, currency: Currency, hide: boolean): string {
  const money = (c: number) => formatMoney(c, currency, { hide, fractionDigits: 0 })
  const month = (d: string) => formatPeriod(periodOf(d)).toLowerCase()
  switch (s.status) {
    case 'done':
      return '¡Meta cumplida!'
    case 'overdue':
      return `La fecha ya pasó · faltan ${money(s.remaining)}`
    case 'onTrack':
      return s.projected ? `Vas bien: a este ritmo llegás en ${month(s.projected)}` : 'Vas bien'
    case 'behind':
      return s.suggestion ? `Para llegar: ${money(s.suggestion.monthly)} por mes (${s.suggestion.months} ${s.suggestion.months === 1 ? 'mes' : 'meses'})` : 'Atrasada'
    case 'noDate':
      return s.projected ? `A este ritmo llegás en ${month(s.projected)}` : `Faltan ${money(s.remaining)}`
    case 'notStarted':
      return s.suggestion ? `Aportando ${money(s.suggestion.monthly)} por mes llegás a tiempo` : 'Todavía sin aportes'
  }
}
