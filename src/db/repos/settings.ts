import type { Settings } from '@/core/types'
import { db } from '../db'
import { DEFAULT_SETTINGS } from '../seed'

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.settings.update('main', patch)
}
