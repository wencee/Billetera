import type { CardPaymentInput } from '@/core/schemas'
import type { CardPayment } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'
import { setStatementInstallmentsStatus } from './installments'

/**
 * Registra un pago. Si es de tipo 'total', marca todas las cuotas del resumen
 * como pagadas. Los saldos de las cuentas se calculan a partir de estos pagos.
 */
export async function addCardPayment(input: CardPaymentInput): Promise<CardPayment> {
  const payment: CardPayment = {
    id: newId(),
    cardId: input.cardId,
    period: input.period,
    amount: input.amount,
    kind: input.kind,
    date: input.date,
    createdAt: nowISO(),
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.note ? { note: input.note } : {}),
  }
  await db.transaction('rw', db.cardPayments, db.installments, async () => {
    await db.cardPayments.add(payment)
    if (payment.kind === 'total') await setStatementInstallmentsStatus(payment.cardId, payment.period, 'paid')
  })
  return payment
}

/** Borra un pago; si era 'total' y no queda otro 'total', las cuotas vuelven a pendientes. */
export async function deleteCardPayment(id: string): Promise<void> {
  await db.transaction('rw', db.cardPayments, db.installments, async () => {
    const payment = await db.cardPayments.get(id)
    if (!payment) return
    await db.cardPayments.delete(id)
    if (payment.kind === 'total') {
      const others = await db.cardPayments.where('[cardId+period]').equals([payment.cardId, payment.period]).toArray()
      if (!others.some((p) => p.kind === 'total')) {
        await setStatementInstallmentsStatus(payment.cardId, payment.period, 'pending')
      }
    }
  })
}
