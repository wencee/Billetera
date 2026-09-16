import { buildSchedule } from '@/core/installments'
import { analyzeFinancing } from '@/core/interest'
import { firstPeriodFor } from '@/core/statements'
import type { Cents, Currency, Financing, InterestInput, ISODate, Period, Purchase, Installment } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'
import { loadOverrides } from './statements'

export interface NewPurchase {
  cardId: string
  description: string
  merchant?: string
  categoryId: string
  date: ISODate
  currency: Currency
  cashPrice: Cents
  installments: number
  financing: Financing
  interestInput?: InterestInput
  /** Si se quiere corregir a mano el resumen de la cuota 1. */
  firstPeriod?: Period
  notes?: string
  recurringId?: string
}

/** Guarda la compra y genera su cronograma de cuotas en una sola transacción. */
export async function createPurchase(input: NewPurchase): Promise<Purchase> {
  const card = await db.cards.get(input.cardId)
  if (!card) throw new Error('Tarjeta inexistente')
  const overrides = await loadOverrides(card.id)

  const analysis = analyzeFinancing({
    cashPrice: input.cashPrice,
    count: input.installments,
    financing: input.financing,
    ...(input.interestInput ? { interestInput: input.interestInput } : {}),
  })
  const firstPeriod = input.firstPeriod ?? firstPeriodFor(card, input.date, overrides)
  const schedule = buildSchedule({ amounts: analysis.installments, firstPeriod, card, overrides })

  const purchase: Purchase = {
    id: newId(),
    cardId: card.id,
    description: input.description,
    categoryId: input.categoryId,
    date: input.date,
    currency: input.currency,
    cashPrice: input.cashPrice,
    installments: input.installments,
    financing: input.financing,
    installmentAmount: analysis.installmentAmount,
    totalAmount: analysis.totalAmount,
    firstPeriod,
    createdAt: nowISO(),
    ...(input.merchant ? { merchant: input.merchant } : {}),
    ...(input.interestInput ? { interestInput: input.interestInput } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.recurringId ? { recurringId: input.recurringId } : {}),
  }
  const rows: Installment[] = schedule.map((s) => ({
    id: newId(),
    purchaseId: purchase.id,
    cardId: card.id,
    number: s.number,
    count: s.count,
    amount: s.amount,
    currency: input.currency,
    period: s.period,
    dueDate: s.dueDate,
    status: 'pending',
  }))

  await db.transaction('rw', db.purchases, db.installments, async () => {
    await db.purchases.add(purchase)
    await db.installments.bulkAdd(rows)
  })
  return purchase
}

export async function deletePurchase(purchaseId: string): Promise<void> {
  await db.transaction('rw', db.purchases, db.installments, async () => {
    await db.installments.where('purchaseId').equals(purchaseId).delete()
    await db.purchases.delete(purchaseId)
  })
}
