import { addDays, addMonths, dateParts, diffDays } from './dates'
import type { Cents, ISODate } from './types'

export interface GoalProgress {
  saved: Cents
  remaining: Cents
  /** 0-1 (puede pasar de 1 si se ahorró de más). */
  pct: number
  done: boolean
}

export function goalProgress(targetAmount: Cents, entries: readonly { amount: Cents }[]): GoalProgress {
  const saved = entries.reduce((s, e) => s + e.amount, 0)
  return {
    saved,
    remaining: Math.max(0, targetAmount - saved),
    pct: targetAmount > 0 ? saved / targetAmount : 0,
    done: targetAmount > 0 && saved >= targetAmount,
  }
}

/**
 * Cantidad de aportes mensuales que entran hasta la fecha objetivo, empezando
 * hoy: hoy, dentro de un mes, dentro de dos… mientras no pasen la fecha.
 * Del 28/09 al 28/02 son 6 (sep a feb); al 10/02 son 5 (el de febrero no llega).
 */
export function monthsLeft(today: ISODate, targetDate: ISODate): number {
  const a = dateParts(today)
  const b = dateParts(targetDate)
  let months = (b.year - a.year) * 12 + (b.month - a.month)
  if (b.day < a.day) months -= 1
  return Math.max(1, months + 1)
}

export interface Suggestion {
  /** Aporte mensual para llegar a tiempo (redondeado para arriba al peso). */
  monthly: Cents
  months: number
  overdue: boolean
}

/** Cuánto aportar por mes para completar `remaining` antes de `targetDate`. */
export function suggestedMonthly(remaining: Cents, today: ISODate, targetDate: ISODate): Suggestion {
  const overdue = targetDate < today
  const months = overdue ? 1 : monthsLeft(today, targetDate)
  const monthly = remaining <= 0 ? 0 : Math.ceil(remaining / months / 100) * 100
  return { monthly, months, overdue }
}

/**
 * Ritmo de ahorro: promedio mensual de los aportes netos de los últimos
 * `windowDays` días (90 por defecto). Si no hubo aportes, 0.
 */
export function savingPace(entries: readonly { amount: Cents; date: ISODate }[], today: ISODate, windowDays = 90): Cents {
  const from = addDays(today, -windowDays + 1)
  const sum = entries.filter((e) => e.date >= from && e.date <= today).reduce((s, e) => s + e.amount, 0)
  return sum > 0 ? Math.round(sum / (windowDays / 30.4375)) : 0
}

/** Fecha estimada en que se completa la meta a este ritmo, o null si el ritmo es 0. */
export function projectedCompletion(remaining: Cents, pace: Cents, today: ISODate): ISODate | null {
  if (remaining <= 0) return today
  if (pace <= 0) return null
  return addMonths(today, Math.ceil(remaining / pace))
}

export type GoalStatus = 'done' | 'onTrack' | 'behind' | 'overdue' | 'noDate' | 'notStarted'

export interface GoalSummary extends GoalProgress {
  status: GoalStatus
  suggestion: Suggestion | null
  pace: Cents
  projected: ISODate | null
  /** Días hasta la fecha objetivo (negativo si ya pasó). */
  daysLeft: number | null
}

export function summarizeGoal(
  goal: { targetAmount: Cents; targetDate?: ISODate | undefined },
  entries: readonly { amount: Cents; date: ISODate }[],
  today: ISODate,
): GoalSummary {
  const progress = goalProgress(goal.targetAmount, entries)
  const pace = savingPace(entries, today)
  const projected = projectedCompletion(progress.remaining, pace, today)
  const suggestion = goal.targetDate && !progress.done ? suggestedMonthly(progress.remaining, today, goal.targetDate) : null
  let status: GoalStatus
  if (progress.done) status = 'done'
  else if (goal.targetDate && goal.targetDate < today) status = 'overdue'
  else if (!goal.targetDate) status = progress.saved > 0 ? 'noDate' : 'notStarted'
  else if (progress.saved <= 0 && pace <= 0) status = 'notStarted'
  else status = projected !== null && projected <= goal.targetDate ? 'onTrack' : 'behind'
  return { ...progress, status, suggestion, pace, projected, daysLeft: goal.targetDate ? diffDays(today, goal.targetDate) : null }
}
