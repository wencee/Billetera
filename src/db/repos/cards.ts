import type { CardInput } from '@/core/schemas'
import type { Card } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'

export async function createCard(input: CardInput): Promise<Card> {
  const card: Card = { id: newId(), ...input, archived: false, createdAt: nowISO() }
  await db.cards.add(card)
  return card
}

export async function updateCard(id: string, patch: Partial<CardInput> & { archived?: boolean }): Promise<void> {
  await db.cards.update(id, patch)
}

/** Solo se puede borrar una tarjeta sin compras; si tiene, se archiva. */
export async function deleteCard(id: string): Promise<'deleted' | 'archived'> {
  return db.transaction('rw', db.cards, db.purchases, db.statementOverrides, db.cardPayments, async () => {
    const purchases = await db.purchases.where('cardId').equals(id).count()
    if (purchases > 0) {
      await db.cards.update(id, { archived: true })
      return 'archived'
    }
    await db.statementOverrides.where('cardId').equals(id).delete()
    await db.cardPayments.where('cardId').equals(id).delete()
    await db.cards.delete(id)
    return 'deleted'
  })
}
