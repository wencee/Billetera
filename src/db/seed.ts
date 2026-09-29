import type { Category, Settings } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from './db'

const EXPENSE_CATEGORIES: [string, string, string][] = [
  ['Supermercado', '🛒', '#34c759'],
  ['Comida afuera', '🍔', '#ff9500'],
  ['Transporte', '🚌', '#5ac8fa'],
  ['Nafta', '⛽', '#ff3b30'],
  ['Casa', '🏠', '#af52de'],
  ['Servicios', '💡', '#ffcc00'],
  ['Salud', '💊', '#ff2d55'],
  ['Ropa', '👕', '#5856d6'],
  ['Entretenimiento', '🎬', '#ff9f0a'],
  ['Suscripciones', '📺', '#007aff'],
  ['Educación', '📚', '#30b0c7'],
  ['Regalos', '🎁', '#ff375f'],
  ['Mascotas', '🐶', '#a2845e'],
  ['Viajes', '✈️', '#64d2ff'],
  ['Tecnología', '💻', '#8e8e93'],
  ['Otros', '📦', '#636366'],
]

const INCOME_CATEGORIES: [string, string, string][] = [
  ['Sueldo', '💼', '#34c759'],
  ['Freelance', '🧑‍💻', '#007aff'],
  ['Ventas', '🏷️', '#ff9500'],
  ['Intereses', '📈', '#30d158'],
  ['Regalo', '🎁', '#ff375f'],
  ['Otros', '📦', '#636366'],
]

/** IDs estables para que los datos de ejemplo y los backups puedan referenciarlas. */
export function defaultCategoryId(kind: 'expense' | 'income', name: string): string {
  return `cat-${kind}-${name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, '-')}`
}

export function defaultCategories(): Category[] {
  const build = (kind: 'expense' | 'income', list: [string, string, string][]): Category[] =>
    list.map(([name, icon, color], order) => ({
      id: defaultCategoryId(kind, name),
      name,
      icon,
      color,
      kind,
      order,
      isDefault: true,
    }))
  return [...build('expense', EXPENSE_CATEGORIES), ...build('income', INCOME_CATEGORIES)]
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  usdRate: 0,
  alertDaysAhead: 3,
  privateMode: false,
  sampleDataLoaded: false,
}

export const DEFAULT_CASH_ACCOUNT_NAME = 'Efectivo'

/**
 * Garantiza categorías iniciales y la fila de ajustes. Idempotente.
 * En la primera apertura crea también una cuenta "Efectivo" para poder
 * cargar un gasto sin configurar nada antes.
 */
export async function ensureDefaults(): Promise<void> {
  await db.transaction('rw', db.categories, db.settings, db.accounts, async () => {
    if ((await db.categories.count()) === 0) await db.categories.bulkAdd(defaultCategories())
    if (!(await db.settings.get('main'))) {
      await db.settings.add(DEFAULT_SETTINGS)
      if ((await db.accounts.count()) === 0) {
        await db.accounts.add({
          id: newId(), name: DEFAULT_CASH_ACCOUNT_NAME, type: 'cash', currency: 'ARS', initialBalance: 0, archived: false, createdAt: nowISO(),
        })
      }
    }
  })
}

/** Categoría "Otros" del tipo dado: destino de los movimientos de una categoría borrada. */
export const fallbackCategoryId = (kind: 'expense' | 'income') => defaultCategoryId(kind, 'Otros')
