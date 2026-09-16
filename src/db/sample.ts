import { addDays, addMonths, dateParts, makeISODate, makePeriod, todayISO } from '@/core/dates'
import type { Account, Card, Expense, Goal, GoalEntry, Income, Recurring } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { DATA_TABLES, db } from './db'
import { defaultCategoryId, ensureDefaults } from './seed'
import { createPurchase } from './repos/purchases'
import { setOverride } from './repos/statements'
import { updateSettings } from './repos/settings'

const cat = (name: string) => defaultCategoryId('expense', name)

/**
 * Carga un juego de datos realista alrededor de la fecha de hoy para poder
 * probar la app sin cargar nada a mano. Se puede borrar desde Ajustes.
 */
export async function loadSampleData(): Promise<void> {
  await ensureDefaults()
  const today = todayISO()
  const created = nowISO()
  const { year, month } = dateParts(today)
  const thisMonth = (day: number) => makeISODate(year, month, day)
  const lastMonth = (day: number) => addMonths(makeISODate(year, month, day), -1)

  const visa: Card = {
    id: newId(), name: 'Visa Galicia', bank: 'Galicia', network: 'visa', last4: '4321', color: '#1d4ed8',
    limit: 250000000, closingDay: 28, dueDay: 10, currencies: ['ARS', 'USD'], archived: false, createdAt: created,
  }
  const master: Card = {
    id: newId(), name: 'Mastercard Santander', bank: 'Santander', network: 'mastercard', last4: '8810', color: '#b91c1c',
    limit: 120000000, closingDay: 15, dueDay: 28, currencies: ['ARS'], archived: false, createdAt: created,
  }
  await db.cards.bulkAdd([visa, master])
  // Cierre corrido, como en el resumen real: el de este mes cierra el 1 del próximo.
  await setOverride(visa.id, makePeriod(year, month), {
    closingDate: addDays(makeISODate(year, month, 31), 1),
    dueDate: addDays(makeISODate(year, month, 31), 14),
  })

  const accounts: Account[] = [
    { id: newId(), name: 'Efectivo', type: 'cash', currency: 'ARS', initialBalance: 5000000, archived: false, createdAt: created },
    { id: newId(), name: 'Banco Galicia', type: 'bank', currency: 'ARS', initialBalance: 120000000, archived: false, createdAt: created },
    { id: newId(), name: 'Mercado Pago', type: 'wallet', currency: 'ARS', initialBalance: 8500000, archived: false, createdAt: created },
    { id: newId(), name: 'Dólares', type: 'cash', currency: 'USD', initialBalance: 150000, archived: false, createdAt: created },
  ]
  await db.accounts.bulkAdd(accounts)
  const [cash, bank, mp] = accounts as [Account, Account, Account, Account]

  await createPurchase({
    cardId: visa.id, description: 'Heladera Samsung', merchant: 'Frávega', categoryId: cat('Casa'),
    date: lastMonth(20), currency: 'ARS', cashPrice: 89999900, installments: 12, financing: 'none',
  })
  await createPurchase({
    cardId: visa.id, description: 'Zapatillas', merchant: 'Dexter', categoryId: cat('Ropa'),
    date: thisMonth(3), currency: 'ARS', cashPrice: 22000000, installments: 6, financing: 'interest',
    interestInput: { mode: 'installment', value: 4500000 },
  })
  await createPurchase({
    cardId: visa.id, description: 'Amazon', merchant: 'Amazon', categoryId: cat('Tecnología'),
    date: thisMonth(10), currency: 'USD', cashPrice: 8000, installments: 1, financing: 'none',
  })
  await createPurchase({
    cardId: master.id, description: 'Supermercado Coto', merchant: 'Coto', categoryId: cat('Supermercado'),
    date: thisMonth(8), currency: 'ARS', cashPrice: 14350000, installments: 3, financing: 'none',
  })
  await createPurchase({
    cardId: master.id, description: 'Notebook', merchant: 'Compumundo', categoryId: cat('Tecnología'),
    date: addMonths(thisMonth(5), -4), currency: 'ARS', cashPrice: 120000000, installments: 18, financing: 'interest',
    interestInput: { mode: 'tna', value: 0.75 },
  })

  const netflix: Recurring = {
    id: newId(), kind: 'expense', name: 'Netflix', amount: 999900, currency: 'ARS', categoryId: cat('Suscripciones'),
    frequency: 'monthly', day: 10, method: 'card', cardId: visa.id, active: true, startDate: addMonths(today, -6),
    lastGeneratedUntil: today, createdAt: created,
  }
  const alquiler: Recurring = {
    id: newId(), kind: 'expense', name: 'Alquiler', amount: 45000000, currency: 'ARS', categoryId: cat('Casa'),
    frequency: 'monthly', day: 5, method: 'transfer', accountId: bank.id, active: true, startDate: addMonths(today, -12),
    lastGeneratedUntil: today, createdAt: created,
  }
  const sueldo: Recurring = {
    id: newId(), kind: 'income', name: 'Sueldo', amount: 210000000, currency: 'ARS',
    frequency: 'monthly', day: 5, method: 'transfer', accountId: bank.id, active: true, startDate: addMonths(today, -12),
    lastGeneratedUntil: today, createdAt: created,
  }
  await db.recurring.bulkAdd([netflix, alquiler, sueldo])

  const expenses: Expense[] = [
    { id: newId(), amount: 1250000, currency: 'ARS', categoryId: cat('Comida afuera'), date: today, method: 'wallet', accountId: mp.id, note: 'Almuerzo', createdAt: created },
    { id: newId(), amount: 380000, currency: 'ARS', categoryId: cat('Transporte'), date: addDays(today, -1), method: 'wallet', accountId: mp.id, note: 'SUBE', createdAt: created },
    { id: newId(), amount: 8990000, currency: 'ARS', categoryId: cat('Supermercado'), date: addDays(today, -2), method: 'debit', accountId: bank.id, createdAt: created },
    { id: newId(), amount: 4500000, currency: 'ARS', categoryId: cat('Nafta'), date: addDays(today, -3), method: 'cash', accountId: cash.id, createdAt: created },
    { id: newId(), amount: 45000000, currency: 'ARS', categoryId: cat('Casa'), date: thisMonth(5), method: 'transfer', accountId: bank.id, note: 'Alquiler', recurringId: alquiler.id, createdAt: created },
    { id: newId(), amount: 2100000, currency: 'ARS', categoryId: cat('Servicios'), date: thisMonth(7), method: 'debit', accountId: bank.id, note: 'Edesur', createdAt: created },
    { id: newId(), amount: 3200000, currency: 'ARS', categoryId: cat('Salud'), date: lastMonth(22), method: 'debit', accountId: bank.id, note: 'Farmacia', createdAt: created },
  ]
  await db.expenses.bulkAdd(expenses)

  const incomes: Income[] = [
    { id: newId(), amount: 210000000, currency: 'ARS', date: thisMonth(5), source: 'Sueldo', accountId: bank.id, recurringId: sueldo.id, createdAt: created },
    { id: newId(), amount: 210000000, currency: 'ARS', date: lastMonth(5), source: 'Sueldo', accountId: bank.id, recurringId: sueldo.id, createdAt: created },
    { id: newId(), amount: 15000000, currency: 'ARS', date: lastMonth(18), source: 'Freelance', accountId: mp.id, createdAt: created },
  ]
  await db.incomes.bulkAdd(incomes)

  const goal: Goal = {
    id: newId(), name: 'Viaje a Brasil', emoji: '🏖️', targetAmount: 150000000, currency: 'ARS',
    targetDate: addMonths(today, 5), archived: false, createdAt: created,
  }
  await db.goals.add(goal)
  const entries: GoalEntry[] = [
    { id: newId(), goalId: goal.id, amount: 20000000, date: addMonths(today, -2), accountId: bank.id, createdAt: created },
    { id: newId(), goalId: goal.id, amount: 20000000, date: addMonths(today, -1), accountId: bank.id, createdAt: created },
  ]
  await db.goalEntries.bulkAdd(entries)

  await db.budgets.bulkAdd([
    { id: newId(), categoryId: cat('Supermercado'), monthlyLimit: 30000000 },
    { id: newId(), categoryId: cat('Comida afuera'), monthlyLimit: 15000000 },
    { id: newId(), categoryId: cat('Transporte'), monthlyLimit: 6000000 },
  ])

  await updateSettings({ usdRate: 145000, usdRateDate: today, sampleDataLoaded: true })
}

/** Borra todos los datos del usuario y vuelve a los valores iniciales. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES.map((t) => db.table(t)), db.settings], async () => {
    for (const t of DATA_TABLES) await db.table(t).clear()
    await db.settings.clear()
  })
  await ensureDefaults()
}
