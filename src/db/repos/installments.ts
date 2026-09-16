import { todayISO } from '@/core/dates'
import type { Installment, InstallmentStatus, Period } from '@/core/types'
import { db } from '../db'

export async function setInstallmentStatus(id: string, status: InstallmentStatus): Promise<void> {
  await db.installments.update(id, status === 'paid' ? { status, paidAt: todayISO() } : { status, paidAt: undefined })
}

/** Cuotas de un resumen (tarjeta + período). */
export async function installmentsForStatement(cardId: string, period: Period): Promise<Installment[]> {
  return db.installments.where('[cardId+period]').equals([cardId, period]).toArray()
}

export async function setStatementInstallmentsStatus(cardId: string, period: Period, status: InstallmentStatus): Promise<void> {
  const rows = await installmentsForStatement(cardId, period)
  const paidAt = status === 'paid' ? todayISO() : undefined
  await db.installments.bulkPut(rows.map((r) => ({ ...r, status, paidAt })))
}
