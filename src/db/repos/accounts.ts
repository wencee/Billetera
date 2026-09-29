import type { AccountInput } from '@/core/schemas'
import type { Account } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'

export async function createAccount(input: AccountInput): Promise<Account> {
  const account: Account = { id: newId(), ...input, archived: false, createdAt: nowISO() }
  await db.accounts.add(account)
  return account
}

export async function updateAccount(id: string, patch: Partial<AccountInput> & { archived?: boolean }): Promise<void> {
  await db.accounts.update(id, patch)
}

/** Cantidad de movimientos que usan la cuenta. */
export async function accountUsage(id: string): Promise<number> {
  const counts = await Promise.all([
    db.expenses.where('accountId').equals(id).count(),
    db.incomes.where('accountId').equals(id).count(),
    db.transfers.where('fromAccountId').equals(id).count(),
    db.transfers.where('toAccountId').equals(id).count(),
    db.cardPayments.where('accountId').equals(id).count(),
    db.goalEntries.where('accountId').equals(id).count(),
    db.recurring.where('accountId').equals(id).count(),
  ])
  return counts.reduce((a, b) => a + b, 0)
}

/** Una cuenta con movimientos no se borra: se archiva para no romper los saldos ni el historial. */
export async function deleteAccount(id: string): Promise<'deleted' | 'archived'> {
  if ((await accountUsage(id)) > 0) {
    await db.accounts.update(id, { archived: true })
    return 'archived'
  }
  await db.accounts.delete(id)
  return 'deleted'
}
