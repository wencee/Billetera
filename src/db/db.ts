import Dexie, { type EntityTable } from 'dexie'
import type {
  Account, Budget, Card, CardPayment, Category, Expense, Goal, GoalEntry, Income, Installment,
  Investment, Purchase, Recurring, Settings, StatementOverride, Transfer,
} from '@/core/types'

/**
 * Base de datos local (IndexedDB vía Dexie).
 *
 * Reglas para cambiar el esquema: NUNCA editar una versión publicada.
 * Agregar `this.version(N+1).stores({...}).upgrade(tx => ...)` debajo.
 * Los índices se declaran acá; las claves primarias son UUID (string).
 */
export class BilleteraDB extends Dexie {
  cards!: EntityTable<Card, 'id'>
  statementOverrides!: EntityTable<StatementOverride, 'id'>
  purchases!: EntityTable<Purchase, 'id'>
  installments!: EntityTable<Installment, 'id'>
  cardPayments!: EntityTable<CardPayment, 'id'>
  accounts!: EntityTable<Account, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  incomes!: EntityTable<Income, 'id'>
  transfers!: EntityTable<Transfer, 'id'>
  recurring!: EntityTable<Recurring, 'id'>
  goals!: EntityTable<Goal, 'id'>
  goalEntries!: EntityTable<GoalEntry, 'id'>
  investments!: EntityTable<Investment, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'billetera') {
    super(name)
    this.version(1).stores({
      cards: 'id, archived',
      statementOverrides: 'id, cardId, [cardId+period]',
      purchases: 'id, cardId, date, categoryId, firstPeriod, recurringId',
      installments: 'id, purchaseId, cardId, period, status, dueDate, [cardId+period], [cardId+status]',
      cardPayments: 'id, cardId, period, accountId, date, [cardId+period]',
      accounts: 'id, archived',
      expenses: 'id, date, categoryId, accountId, recurringId',
      incomes: 'id, date, accountId, recurringId',
      transfers: 'id, date, fromAccountId, toAccountId',
      recurring: 'id, kind, active, cardId, accountId',
      goals: 'id, archived',
      goalEntries: 'id, goalId, date, accountId',
      investments: 'id, type, closed',
      budgets: 'id, &categoryId',
      categories: 'id, kind, order',
      settings: 'id',
    })
  }
}

export const db = new BilleteraDB()

/** Tablas de datos del usuario, en el orden en que se exportan/borran. */
export const DATA_TABLES = [
  'cards', 'statementOverrides', 'purchases', 'installments', 'cardPayments', 'accounts', 'expenses',
  'incomes', 'transfers', 'recurring', 'goals', 'goalEntries', 'investments', 'budgets', 'categories',
] as const
export type DataTable = (typeof DATA_TABLES)[number]
