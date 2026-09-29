import { addDays, todayISO } from '@/core/dates'
import { dueOccurrences } from '@/core/recurring'
import type { RecurringInput } from '@/core/schemas'
import type { Recurring } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'
import { fallbackCategoryId } from '../seed'
import { createExpense, createIncome } from './movements'
import { createPurchase } from './purchases'

function toRow(input: RecurringInput, base: Pick<Recurring, 'id' | 'createdAt'> & { lastGeneratedUntil?: string | undefined }): Recurring {
  const row: Recurring = {
    id: base.id,
    kind: input.kind,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    frequency: input.frequency,
    day: input.day,
    method: input.method,
    active: input.active,
    startDate: input.startDate,
    createdAt: base.createdAt,
  }
  if (input.categoryId) row.categoryId = input.categoryId
  if (input.method === 'card') {
    if (input.cardId) row.cardId = input.cardId
    row.installments = input.installments ?? 1
  } else if (input.accountId) {
    row.accountId = input.accountId
  }
  if (input.endDate) row.endDate = input.endDate
  if (base.lastGeneratedUntil) row.lastGeneratedUntil = base.lastGeneratedUntil
  return row
}

export async function createRecurring(input: RecurringInput): Promise<Recurring> {
  const row = toRow(input, { id: newId(), createdAt: nowISO() })
  await db.recurring.add(row)
  await generateDueRecurring()
  return row
}

/**
 * Editar no toca lo ya generado. Si se adelanta la fecha de inicio, no se
 * rellenan meses pasados: se sigue desde donde se había generado.
 */
export async function updateRecurring(id: string, input: RecurringInput): Promise<void> {
  const existing = await db.recurring.get(id)
  if (!existing) throw new Error('Gasto fijo inexistente')
  // Al reactivar una regla pausada no se cobran los períodos en que estuvo pausada.
  const reactivated = !existing.active && input.active
  const lastGeneratedUntil = reactivated ? addDays(todayISO(), -1) : existing.lastGeneratedUntil
  await db.recurring.put(toRow(input, { ...existing, lastGeneratedUntil }))
  await generateDueRecurring()
}

/** Los movimientos ya generados quedan; solo deja de generar nuevos. */
export async function deleteRecurring(id: string): Promise<Recurring | undefined> {
  const row = await db.recurring.get(id)
  await db.recurring.delete(id)
  return row
}

export async function restoreRecurring(row: Recurring): Promise<void> {
  await db.recurring.put(row)
}

let running: Promise<number> | null = null

/**
 * Crea los gastos, ingresos y consumos con tarjeta de los fijos que ya
 * vencieron y todavía no se cargaron. Se llama al abrir la app y cada vez
 * que vuelve al frente. Es idempotente: cada regla recuerda hasta qué día
 * generó (`lastGeneratedUntil`), y dos llamadas simultáneas comparten la misma ejecución.
 */
export function generateDueRecurring(today: string = todayISO()): Promise<number> {
  running ??= run(today).finally(() => {
    running = null
  })
  return running
}

async function run(today: string): Promise<number> {
  const rules = (await db.recurring.toArray()).filter((r) => r.active)
  let generated = 0
  for (const rule of rules) {
    const dates = dueOccurrences(rule, today)
    await db.transaction('rw', [db.recurring, db.expenses, db.incomes, db.purchases, db.installments, db.cards, db.statementOverrides], async () => {
      // Releer dentro de la transacción: otra pestaña o llamada pudo haberla avanzado.
      const fresh = await db.recurring.get(rule.id)
      if (!fresh || !fresh.active || fresh.lastGeneratedUntil !== rule.lastGeneratedUntil) return
      for (const date of dates) {
        if (fresh.kind === 'income') {
          if (!fresh.accountId) continue
          await createIncome({ amount: fresh.amount, currency: fresh.currency, date, source: fresh.name, accountId: fresh.accountId, recurringId: fresh.id })
        } else if (fresh.method === 'card') {
          if (!fresh.cardId || !(await db.cards.get(fresh.cardId))) continue
          await createPurchase({
            cardId: fresh.cardId, description: fresh.name, categoryId: fresh.categoryId ?? fallbackCategoryId('expense'), date,
            currency: fresh.currency, cashPrice: fresh.amount, installments: fresh.installments ?? 1, financing: 'none', recurringId: fresh.id,
          })
        } else {
          if (!fresh.accountId) continue
          await createExpense({
            amount: fresh.amount, currency: fresh.currency, categoryId: fresh.categoryId ?? fallbackCategoryId('expense'), date,
            method: fresh.method, accountId: fresh.accountId, note: fresh.name, recurringId: fresh.id,
          })
        }
        generated++
      }
      await db.recurring.update(fresh.id, { lastGeneratedUntil: today })
    })
  }
  return generated
}
