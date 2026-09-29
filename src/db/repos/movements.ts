import type { MovementKind } from '@/core/movements'
import type { ExpenseInput, IncomeInput, TransferInput } from '@/core/schemas'
import type { Expense, Income, Transfer } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'
import { deleteCardPayment, restoreCardPayment } from './payments'
import { deletePurchase, restorePurchase } from './purchases'

/** Quita las claves con undefined para no guardar campos vacíos. */
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as T
}

// ---------- Gastos ----------

export async function createExpense(input: ExpenseInput & { recurringId?: string }): Promise<Expense> {
  const expense = clean<Expense>({ id: newId(), ...input, createdAt: nowISO() })
  await db.expenses.add(expense)
  return expense
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  const existing = await db.expenses.get(id)
  if (!existing) throw new Error('Gasto inexistente')
  await db.expenses.put(clean<Expense>({ ...input, id, createdAt: existing.createdAt, ...(existing.recurringId ? { recurringId: existing.recurringId } : {}) }))
}

// ---------- Ingresos ----------

export async function createIncome(input: IncomeInput & { recurringId?: string }): Promise<Income> {
  const income = clean<Income>({ id: newId(), ...input, createdAt: nowISO() })
  await db.incomes.add(income)
  return income
}

export async function updateIncome(id: string, input: IncomeInput): Promise<void> {
  const existing = await db.incomes.get(id)
  if (!existing) throw new Error('Ingreso inexistente')
  await db.incomes.put(clean<Income>({ ...input, id, createdAt: existing.createdAt, ...(existing.recurringId ? { recurringId: existing.recurringId } : {}) }))
}

// ---------- Transferencias ----------

export async function createTransfer(input: TransferInput): Promise<Transfer> {
  const transfer = clean<Transfer>({ id: newId(), ...input, createdAt: nowISO() })
  await db.transfers.add(transfer)
  return transfer
}

export async function updateTransfer(id: string, input: TransferInput): Promise<void> {
  const existing = await db.transfers.get(id)
  if (!existing) throw new Error('Transferencia inexistente')
  await db.transfers.put(clean<Transfer>({ ...input, id, createdAt: existing.createdAt }))
}

// ---------- Borrar con deshacer ----------

export type Undo = () => Promise<void>

/**
 * Borra cualquier movimiento de la lista unificada y devuelve la función
 * para deshacerlo (vuelve exactamente la misma fila, con el mismo id).
 */
export async function deleteMovement(kind: MovementKind, id: string): Promise<Undo | null> {
  switch (kind) {
    case 'expense': {
      const row = await db.expenses.get(id)
      if (!row) return null
      await db.expenses.delete(id)
      return async () => void (await db.expenses.put(row))
    }
    case 'income': {
      const row = await db.incomes.get(id)
      if (!row) return null
      await db.incomes.delete(id)
      return async () => void (await db.incomes.put(row))
    }
    case 'transfer': {
      const row = await db.transfers.get(id)
      if (!row) return null
      await db.transfers.delete(id)
      return async () => void (await db.transfers.put(row))
    }
    case 'card': {
      const snapshot = await deletePurchase(id)
      return snapshot ? () => restorePurchase(snapshot) : null
    }
    case 'cardPayment': {
      const row = await db.cardPayments.get(id)
      if (!row) return null
      await deleteCardPayment(id)
      return () => restoreCardPayment(row)
    }
    case 'saving': {
      // Solo los aportes/retiros de metas se borran desde la lista; las inversiones, desde su detalle.
      const row = await db.goalEntries.get(id)
      if (!row) return null
      await db.goalEntries.delete(id)
      return async () => void (await db.goalEntries.put(row))
    }
  }
}
