import { buildSchedule } from '@/core/installments'
import { analyzeFinancing } from '@/core/interest'
import type { PurchaseInput } from '@/core/schemas'
import { firstPeriodFor } from '@/core/statements'
import type { Card, Installment, Purchase } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'
import { loadOverrides } from './statements'

export type NewPurchase = PurchaseInput & { recurringId?: string }

interface Built {
  purchase: Purchase
  installments: Installment[]
}

async function buildPurchase(input: NewPurchase, existing?: Purchase, previous: readonly Installment[] = []): Promise<Built> {
  const card: Card | undefined = await db.cards.get(input.cardId)
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
    id: existing?.id ?? newId(),
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
    createdAt: existing?.createdAt ?? nowISO(),
    ...(input.merchant ? { merchant: input.merchant } : {}),
    ...(input.interestInput ? { interestInput: input.interestInput } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.recurringId ? { recurringId: input.recurringId } : {}),
  }
  // Al editar, las cuotas ya pagadas conservan su estado por número.
  const paidByNumber = new Map(previous.filter((i) => i.status === 'paid').map((i) => [i.number, i.paidAt]))
  const installments: Installment[] = schedule.map((s) => {
    const paidAt = paidByNumber.get(s.number)
    return {
      id: newId(),
      purchaseId: purchase.id,
      cardId: card.id,
      number: s.number,
      count: s.count,
      amount: s.amount,
      currency: input.currency,
      period: s.period,
      dueDate: s.dueDate,
      status: paidByNumber.has(s.number) ? 'paid' : 'pending',
      ...(paidAt ? { paidAt } : {}),
    }
  })
  return { purchase, installments }
}

/** Guarda la compra y genera su cronograma de cuotas en una sola transacción. */
export async function createPurchase(input: NewPurchase): Promise<Purchase> {
  const { purchase, installments } = await buildPurchase(input)
  await db.transaction('rw', db.purchases, db.installments, async () => {
    await db.purchases.add(purchase)
    await db.installments.bulkAdd(installments)
  })
  return purchase
}

/** Reemplaza la compra y regenera las cuotas (las pagadas siguen pagadas). */
export async function updatePurchase(id: string, input: NewPurchase): Promise<Purchase> {
  const existing = await db.purchases.get(id)
  if (!existing) throw new Error('Compra inexistente')
  const previous = await db.installments.where('purchaseId').equals(id).toArray()
  const { purchase, installments } = await buildPurchase(input, existing, previous)
  await db.transaction('rw', db.purchases, db.installments, async () => {
    await db.installments.where('purchaseId').equals(id).delete()
    await db.purchases.put(purchase)
    await db.installments.bulkAdd(installments)
  })
  return purchase
}

export interface PurchaseSnapshot {
  purchase: Purchase
  installments: Installment[]
}

/** Borra y devuelve una copia para poder deshacer. */
export async function deletePurchase(purchaseId: string): Promise<PurchaseSnapshot | null> {
  return db.transaction('rw', db.purchases, db.installments, async () => {
    const purchase = await db.purchases.get(purchaseId)
    if (!purchase) return null
    const installments = await db.installments.where('purchaseId').equals(purchaseId).toArray()
    await db.installments.where('purchaseId').equals(purchaseId).delete()
    await db.purchases.delete(purchaseId)
    return { purchase, installments }
  })
}

export async function restorePurchase(snapshot: PurchaseSnapshot): Promise<void> {
  await db.transaction('rw', db.purchases, db.installments, async () => {
    await db.purchases.put(snapshot.purchase)
    await db.installments.bulkPut(snapshot.installments)
  })
}
