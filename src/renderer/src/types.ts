export interface Coffee {
  id: string
  name: string
  roaster: string
  origin: string
  roast_date: string | null
  purchase_date: string | null
  net_weight_g: number | null
  notes: string | null
  is_active: number        // 0 | 1  (SQLite stores boolean as integer)
  created_at: string
  last_modified: string
  synced_at: string | null
}

export interface GrindProfile {
  id: string
  coffee_id: string
  basket_type: string
  dosage_g: number | null
  grind_size: string | null
  water_amount_ml: number | null
  notes: string | null
  created_at: string
  last_modified: string
  synced_at: string | null
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  error: string | null
}

// ── Routing ───────────────────────────────────────────────────────────────────

export type View =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'add' }
  | { name: 'edit'; coffeeId: string }
