import type { Cents } from '@/core/types'
import { newId } from '@/lib/id'
import { db } from '../db'

/** Define (o quita, con null) el límite mensual de una categoría. */
export async function setBudget(categoryId: string, monthlyLimit: Cents | null): Promise<void> {
  const existing = await db.budgets.where('categoryId').equals(categoryId).first()
  if (monthlyLimit === null || monthlyLimit <= 0) {
    if (existing) await db.budgets.delete(existing.id)
    return
  }
  await db.budgets.put({ id: existing?.id ?? newId(), categoryId, monthlyLimit })
}
