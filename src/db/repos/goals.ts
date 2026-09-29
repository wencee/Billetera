import type { GoalEntryInput, GoalInput } from '@/core/schemas'
import type { Goal, GoalEntry } from '@/core/types'
import { newId, nowISO } from '@/lib/id'
import { db } from '../db'

export async function createGoal(input: GoalInput): Promise<Goal> {
  const goal: Goal = {
    id: newId(), name: input.name, emoji: input.emoji, targetAmount: input.targetAmount, currency: input.currency,
    archived: false, createdAt: nowISO(), ...(input.targetDate ? { targetDate: input.targetDate } : {}),
  }
  await db.goals.add(goal)
  return goal
}

export async function updateGoal(id: string, input: GoalInput & { archived?: boolean }): Promise<void> {
  const existing = await db.goals.get(id)
  if (!existing) throw new Error('Meta inexistente')
  const next: Goal = {
    id, name: input.name, emoji: input.emoji, targetAmount: input.targetAmount, currency: input.currency,
    archived: input.archived ?? existing.archived, createdAt: existing.createdAt, ...(input.targetDate ? { targetDate: input.targetDate } : {}),
  }
  await db.goals.put(next)
}

export async function setGoalArchived(id: string, archived: boolean): Promise<void> {
  await db.goals.update(id, { archived })
}

export interface GoalSnapshot {
  goal: Goal
  entries: GoalEntry[]
}

/**
 * Borra la meta y su historial. Si los aportes salieron de cuentas, esa plata
 * vuelve a figurar en las cuentas (porque desaparecen los aportes).
 */
export async function deleteGoal(id: string): Promise<GoalSnapshot | null> {
  return db.transaction('rw', db.goals, db.goalEntries, async () => {
    const goal = await db.goals.get(id)
    if (!goal) return null
    const entries = await db.goalEntries.where('goalId').equals(id).toArray()
    await db.goalEntries.where('goalId').equals(id).delete()
    await db.goals.delete(id)
    return { goal, entries }
  })
}

export async function restoreGoal(snapshot: GoalSnapshot): Promise<void> {
  await db.transaction('rw', db.goals, db.goalEntries, async () => {
    await db.goals.put(snapshot.goal)
    await db.goalEntries.bulkPut(snapshot.entries)
  })
}

export async function addGoalEntry(input: GoalEntryInput): Promise<GoalEntry> {
  const entry: GoalEntry = {
    id: newId(), goalId: input.goalId, amount: input.amount, date: input.date, createdAt: nowISO(),
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.note ? { note: input.note } : {}),
  }
  await db.goalEntries.add(entry)
  return entry
}

export async function deleteGoalEntry(id: string): Promise<(() => Promise<void>) | null> {
  const row = await db.goalEntries.get(id)
  if (!row) return null
  await db.goalEntries.delete(id)
  return async () => void (await db.goalEntries.put(row))
}
