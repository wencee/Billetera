import type { DateOverride, Overrides } from '@/core/statements'
import type { Period, StatementOverride } from '@/core/types'
import { newId } from '@/lib/id'
import { db } from '../db'

/** Mapa período → fechas corregidas de una tarjeta, listo para el core. */
export async function loadOverrides(cardId: string): Promise<Overrides> {
  const rows = await db.statementOverrides.where('cardId').equals(cardId).toArray()
  if (rows.length === 0) return undefined
  return toOverrideMap(rows)
}

export function toOverrideMap(rows: readonly StatementOverride[]): ReadonlyMap<Period, DateOverride> {
  const map = new Map<Period, DateOverride>()
  for (const r of rows) {
    const entry: DateOverride = {}
    if (r.closingDate) entry.closingDate = r.closingDate
    if (r.dueDate) entry.dueDate = r.dueDate
    map.set(r.period, entry)
  }
  return map
}

export async function setOverride(cardId: string, period: Period, dates: DateOverride): Promise<void> {
  const existing = await db.statementOverrides.where('[cardId+period]').equals([cardId, period]).first()
  const row: StatementOverride = { id: existing?.id ?? newId(), cardId, period, ...dates }
  if (!dates.closingDate && !dates.dueDate) {
    if (existing) await db.statementOverrides.delete(existing.id)
    return
  }
  await db.statementOverrides.put(row)
}
