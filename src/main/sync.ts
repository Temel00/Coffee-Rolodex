import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { BrowserWindow } from 'electron'
import WebSocket from 'ws'

// Node.js 20 has no native WebSocket global; Supabase's realtime client requires one.
if (!('WebSocket' in globalThis)) {
  Object.assign(globalThis, { WebSocket })
}
import {
  getDb,
  getSetting,
  setSetting,
  type Coffee,
  type GrindProfile,
} from './database'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  error: string | null
}

let _supabase: SupabaseClient | null = null
let _syncing = false
let _mainWindow: BrowserWindow | null = null

export function configureSyncWindow(win: BrowserWindow): void {
  _mainWindow = win
}

export function configureSupabase(url: string, key: string): void {
  _supabase = createClient(url, key)
}

export function isSyncing(): boolean {
  return _syncing
}

function send(state: SyncState): void {
  _mainWindow?.webContents.send('sync:status', state)
}

export async function sync(): Promise<void> {
  if (_syncing || !_supabase) return

  _syncing = true
  send({ status: 'syncing', lastSyncAt: getSetting('last_sync_at') ?? null, error: null })

  try {
    const db = getDb()
    const lastSyncAt = getSetting('last_sync_at') ?? '1970-01-01T00:00:00.000Z'
    const syncTime = new Date().toISOString()

    // ── PUSH local changes ────────────────────────────────────────────────────

    const pendingDeletes = db
      .prepare(`SELECT * FROM coffees WHERE deleted_at IS NOT NULL AND (synced_at IS NULL OR last_modified > synced_at)`)
      .all() as Coffee[]

    const dirtyCofffees = db
      .prepare(`SELECT * FROM coffees WHERE deleted_at IS NULL AND (synced_at IS NULL OR last_modified > synced_at)`)
      .all() as Coffee[]

    const dirtyProfiles = db
      .prepare(`SELECT * FROM grind_profiles WHERE synced_at IS NULL OR last_modified > synced_at`)
      .all() as GrindProfile[]

    if (pendingDeletes.length > 0) {
      const ids = pendingDeletes.map((c) => c.id)
      const { error } = await _supabase.from('coffees').delete().in('id', ids)
      if (!error) {
        const del = db.prepare('DELETE FROM coffees WHERE id = ?')
        for (const c of pendingDeletes) del.run(c.id)
      }
    }

    if (dirtyCofffees.length > 0) {
      const rows = dirtyCofffees.map(({ deleted_at: _, ...c }) => ({ ...c, is_active: c.is_active === 1 }))
      const { error } = await _supabase.from('coffees').upsert(rows)
      if (!error) {
        const stmt = db.prepare('UPDATE coffees SET synced_at = ? WHERE id = ?')
        for (const c of dirtyCofffees) stmt.run(c.last_modified, c.id)
      }
    }

    if (dirtyProfiles.length > 0) {
      const { error } = await _supabase.from('grind_profiles').upsert(dirtyProfiles)
      if (!error) {
        const stmt = db.prepare('UPDATE grind_profiles SET synced_at = ? WHERE id = ?')
        for (const p of dirtyProfiles) stmt.run(p.last_modified, p.id)
      }
    }

    // ── PULL remote changes ───────────────────────────────────────────────────

    const { data: remoteCoffees } = await _supabase
      .from('coffees')
      .select('*')
      .gt('last_modified', lastSyncAt)

    if (remoteCoffees && remoteCoffees.length > 0) {
      const upsert = db.prepare(`
        INSERT OR REPLACE INTO coffees
          (id, name, roaster, origin, roast_date, purchase_date, net_weight_g,
           notes, is_active, created_at, last_modified, synced_at, deleted_at)
        VALUES
          (@id, @name, @roaster, @origin, @roast_date, @purchase_date, @net_weight_g,
           @notes, @is_active, @created_at, @last_modified, @synced_at, @deleted_at)
      `)
      for (const r of remoteCoffees) {
        const local = db
          .prepare('SELECT last_modified FROM coffees WHERE id = ?')
          .get(r.id) as { last_modified: string } | undefined
        if (!local || r.last_modified > local.last_modified) {
          upsert.run({ ...r, is_active: r.is_active ? 1 : 0, synced_at: r.last_modified, deleted_at: null })
        }
      }
    }

    const { data: remoteProfiles } = await _supabase
      .from('grind_profiles')
      .select('*')
      .gt('last_modified', lastSyncAt)

    if (remoteProfiles && remoteProfiles.length > 0) {
      const upsert = db.prepare(`
        INSERT OR REPLACE INTO grind_profiles
          (id, coffee_id, basket_type, dosage_g, grind_size, water_amount_ml,
           notes, created_at, last_modified, synced_at)
        VALUES
          (@id, @coffee_id, @basket_type, @dosage_g, @grind_size, @water_amount_ml,
           @notes, @created_at, @last_modified, @synced_at)
      `)
      for (const r of remoteProfiles) {
        const local = db
          .prepare('SELECT last_modified FROM grind_profiles WHERE id = ?')
          .get(r.id) as { last_modified: string } | undefined
        if (!local || r.last_modified > local.last_modified) {
          upsert.run({ ...r, synced_at: r.last_modified })
        }
      }
    }

    setSetting('last_sync_at', syncTime)
    send({ status: 'success', lastSyncAt: syncTime, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error'
    send({ status: 'error', lastSyncAt: getSetting('last_sync_at') ?? null, error: message })
    // App continues normally on sync failure
  } finally {
    _syncing = false
  }
}

export function syncInBackground(): void {
  sync().catch(() => {/* silent */})
}
