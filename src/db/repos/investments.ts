import type { CloseInvestmentInput, InvestmentInput } from '@/core/schemas'
import type { Cents, ISODate, Investment } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'

function fromInput(input: InvestmentInput, base: Pick<Investment, 'id' | 'createdAt' | 'closed'> & Partial<Investment>): Investment {
  const inv: Investment = {
    ...base,
    type: input.type,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
  }
  // Campos opcionales: se limpian si el formulario los dejó vacíos.
  delete inv.tna
  delete inv.maturityDate
  delete inv.accountId
  delete inv.notes
  if (input.type === 'plazo_fijo') {
    if (input.tna !== undefined) inv.tna = input.tna
    if (input.maturityDate) inv.maturityDate = input.maturityDate
  }
  if (input.accountId) inv.accountId = input.accountId
  if (input.notes) inv.notes = input.notes
  return inv
}

export async function createInvestment(input: InvestmentInput & { renewedFromId?: string }): Promise<Investment> {
  const inv = fromInput(input, { id: newId(), createdAt: nowISO(), closed: false })
  if (input.renewedFromId) inv.renewedFromId = input.renewedFromId
  await db.investments.add(inv)
  return inv
}

export async function updateInvestment(id: string, input: InvestmentInput): Promise<void> {
  const existing = await db.investments.get(id)
  if (!existing) throw new Error('Inversión inexistente')
  await db.investments.put(fromInput(input, existing))
}

/** Valuación cargada a mano (FCI, cripto, acciones). null la borra y vuelve al cálculo automático. */
export async function setValuation(id: string, value: Cents | null, date: ISODate): Promise<void> {
  const existing = await db.investments.get(id)
  if (!existing) return
  const next = { ...existing }
  if (value === null) {
    delete next.currentValue
    delete next.currentValueDate
  } else {
    next.currentValue = value
    next.currentValueDate = date
  }
  await db.investments.put(next)
}

/**
 * Rescate: se cobra `amount` en la cuenta elegida (o, sin cuenta, queda
 * como registro). Devuelve la función para deshacer.
 */
export async function closeInvestment(id: string, input: CloseInvestmentInput): Promise<() => Promise<void>> {
  const before = await db.investments.get(id)
  if (!before) throw new Error('Inversión inexistente')
  const closed: Investment = { ...before, closed: true, closedAt: input.date, closedAmount: input.amount }
  delete closed.closedAccountId
  if (input.accountId) closed.closedAccountId = input.accountId
  await db.investments.put(closed)
  return async () => void (await db.investments.put(before))
}

/**
 * Renovar un plazo fijo: cierra el actual por capital + intereses sin pasar
 * por ninguna cuenta y abre uno nuevo por ese total desde el vencimiento.
 */
export async function renewFixedTerm(id: string, params: { total: Cents; startDate: ISODate; maturityDate: ISODate; tna: number }): Promise<Investment> {
  return db.transaction('rw', db.investments, async () => {
    const current = await db.investments.get(id)
    if (!current) throw new Error('Inversión inexistente')
    const closed: Investment = { ...current, closed: true, closedAt: params.startDate, closedAmount: params.total }
    delete closed.closedAccountId
    await db.investments.put(closed)
    return createInvestment({
      type: 'plazo_fijo', name: current.name, amount: params.total, currency: current.currency, date: params.startDate,
      tna: params.tna, maturityDate: params.maturityDate, renewedFromId: current.id,
    })
  })
}

export async function deleteInvestment(id: string): Promise<(() => Promise<void>) | null> {
  const row = await db.investments.get(id)
  if (!row) return null
  await db.investments.delete(id)
  return async () => void (await db.investments.put(row))
}

/** Deshace un rescate: vuelve a estar abierta y la plata sale de la cuenta donde había entrado. */
export async function reopenInvestment(id: string): Promise<void> {
  const inv = await db.investments.get(id)
  if (!inv) return
  const next: Investment = { ...inv, closed: false }
  delete next.closedAt
  delete next.closedAmount
  delete next.closedAccountId
  await db.investments.put(next)
}
