import Dexie, { type Table } from 'dexie'
import type { Shot, Settings } from './types'

class RevelateurDB extends Dexie {
  shots!: Table<Shot, number>
  settings!: Table<Settings, number>

  constructor() {
    super('revelateur')
    this.version(1).stores({
      shots: '++id, createdAt, favourite, provider',
      settings: '++id',
    })
  }
}

export const db = new RevelateurDB()

// Fresh / empty IndexedDB: `.first()` → undefined; we coalesce to a real default.
export async function getSettings(): Promise<Settings> {
  const existing = (await db.settings.toCollection().first()) ?? null
  if (existing) return existing
  const fresh: Settings = { onboarded: false, lastProvider: 'fal' }
  const id = await db.settings.add(fresh)
  return { ...fresh, id }
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const s = await getSettings()
  await db.settings.update(s.id!, patch)
}

export async function saveShot(s: Omit<Shot, 'id'>): Promise<number> {
  return db.shots.add(s as Shot)
}

export async function toggleFavourite(id: number, fav: boolean): Promise<void> {
  await db.shots.update(id, { favourite: fav })
}

export async function deleteShot(id: number): Promise<void> {
  await db.shots.delete(id)
}

export async function clearAll(): Promise<void> {
  await db.shots.clear()
}
