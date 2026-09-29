import type { CategoryInput } from '@/core/schemas'
import type { Category } from '@/core/types'
import { newId } from '@/lib/id'
import { db } from '../db'
import { fallbackCategoryId } from '../seed'

export async function createCategory(input: CategoryInput): Promise<Category> {
  const last = await db.categories.where('kind').equals(input.kind).sortBy('order')
  const category: Category = { id: newId(), ...input, order: (last[last.length - 1]?.order ?? -1) + 1, isDefault: false }
  await db.categories.add(category)
  return category
}

export async function updateCategory(id: string, patch: Partial<Omit<CategoryInput, 'kind'>>): Promise<void> {
  await db.categories.update(id, patch)
}

export async function categoryUsage(id: string): Promise<number> {
  const counts = await Promise.all([
    db.expenses.where('categoryId').equals(id).count(),
    db.purchases.where('categoryId').equals(id).count(),
    db.recurring.filter((r) => r.categoryId === id).count(),
  ])
  return counts.reduce((a, b) => a + b, 0)
}

/**
 * Borra una categoría. Lo que la usaba pasa a "Otros" y su presupuesto se
 * elimina. "Otros" no se puede borrar porque es el destino.
 */
export async function deleteCategory(id: string): Promise<{ moved: number }> {
  const category = await db.categories.get(id)
  if (!category) return { moved: 0 }
  const fallback = fallbackCategoryId(category.kind)
  if (id === fallback) throw new Error('La categoría "Otros" no se puede borrar')
  return db.transaction('rw', [db.categories, db.expenses, db.purchases, db.recurring, db.budgets], async () => {
    const moved =
      (await db.expenses.where('categoryId').equals(id).modify({ categoryId: fallback })) +
      (await db.purchases.where('categoryId').equals(id).modify({ categoryId: fallback })) +
      (await db.recurring.filter((r) => r.categoryId === id).modify({ categoryId: fallback }))
    await db.budgets.where('categoryId').equals(id).delete()
    await db.categories.delete(id)
    return { moved }
  })
}

/** Mueve una categoría un lugar arriba o abajo dentro de su tipo. */
export async function moveCategory(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const category = await db.categories.get(id)
    if (!category) return
    const list = await db.categories.where('kind').equals(category.kind).sortBy('order')
    const idx = list.findIndex((c) => c.id === id)
    const other = list[idx + direction]
    if (!other) return
    // Renumerar todo evita empates heredados.
    const reordered = [...list]
    reordered[idx] = other
    reordered[idx + direction] = category
    await db.categories.bulkPut(reordered.map((c, order) => ({ ...c, order })))
  })
}
