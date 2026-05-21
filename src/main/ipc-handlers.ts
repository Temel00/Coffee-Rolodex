import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import {
  getAllCoffees,
  getCoffeeById,
  getMostRecentCoffee,
  createCoffee,
  updateCoffee,
  deleteCoffee,
  getGrindProfilesForCoffee,
  createGrindProfile,
  updateGrindProfile,
  deleteGrindProfile,
  getSetting,
  type CreateCoffeeInput,
  type UpdateCoffeeInput,
  type CreateGrindInput,
  type UpdateGrindInput,
} from './database'
import { sync, isSyncing } from './sync'

export function registerIpcHandlers(): void {
  // ── Coffees ────────────────────────────────────────────────────────────────

  ipcMain.handle('coffee:getAll', () => getAllCoffees())

  ipcMain.handle('coffee:getById', (_e, id: string) => getCoffeeById(id) ?? null)

  ipcMain.handle('coffee:getMostRecent', () => getMostRecentCoffee() ?? null)

  ipcMain.handle('coffee:create', (_e, input: CreateCoffeeInput) =>
    createCoffee(randomUUID(), input)
  )

  ipcMain.handle('coffee:update', (_e, id: string, input: UpdateCoffeeInput) =>
    updateCoffee(id, input) ?? null
  )

  ipcMain.handle('coffee:delete', (_e, id: string) => deleteCoffee(id))

  // ── Grind Profiles ─────────────────────────────────────────────────────────

  ipcMain.handle('grind:getForCoffee', (_e, coffeeId: string) =>
    getGrindProfilesForCoffee(coffeeId)
  )

  ipcMain.handle('grind:create', (_e, input: CreateGrindInput) =>
    createGrindProfile(randomUUID(), input)
  )

  ipcMain.handle('grind:update', (_e, id: string, input: UpdateGrindInput) =>
    updateGrindProfile(id, input) ?? null
  )

  ipcMain.handle('grind:delete', (_e, id: string) => deleteGrindProfile(id))

  // ── Sync ───────────────────────────────────────────────────────────────────

  ipcMain.handle('sync:trigger', () => sync())

  ipcMain.handle('sync:getLastSyncAt', () => getSetting('last_sync_at') ?? null)

  ipcMain.handle('sync:isSyncing', () => isSyncing())
}
