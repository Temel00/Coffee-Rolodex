import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'

export interface Coffee {
  id: string
  name: string
  roaster: string
  origin: string
  roast_date: string | null
  purchase_date: string | null
  net_weight_g: number | null
  notes: string | null
  is_active: number  // 0 | 1
  created_at: string
  last_modified: string
  synced_at: string | null
  deleted_at: string | null
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

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = join(app.getPath('userData'), 'coffee-rolodex.db')
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

export function initDb(path: string): void {
  _db = new Database(path)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
}

export function closeDb(): void {
  _db?.close()
  _db = null
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS coffees (
      id              TEXT    PRIMARY KEY,
      name            TEXT    NOT NULL,
      roaster         TEXT    NOT NULL DEFAULT '',
      origin          TEXT    NOT NULL DEFAULT '',
      roast_date      TEXT,
      purchase_date   TEXT,
      net_weight_g    REAL,
      notes           TEXT,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    NOT NULL,
      last_modified   TEXT    NOT NULL,
      synced_at       TEXT
    );

    CREATE TABLE IF NOT EXISTS grind_profiles (
      id              TEXT    PRIMARY KEY,
      coffee_id       TEXT    NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
      basket_type     TEXT    NOT NULL DEFAULT '',
      dosage_g        REAL,
      grind_size      TEXT,
      water_amount_ml REAL,
      notes           TEXT,
      created_at      TEXT    NOT NULL,
      last_modified   TEXT    NOT NULL,
      synced_at       TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coffees_last_modified    ON coffees(last_modified);
    CREATE INDEX IF NOT EXISTS idx_coffees_is_active        ON coffees(is_active);
    CREATE INDEX IF NOT EXISTS idx_grind_profiles_coffee_id ON grind_profiles(coffee_id);
    CREATE INDEX IF NOT EXISTS idx_grind_profiles_last_mod  ON grind_profiles(last_modified);
  `)
  // Migration: add deleted_at column if it doesn't exist yet
  try { db.exec('ALTER TABLE coffees ADD COLUMN deleted_at TEXT') } catch {}
}

function now(): string {
  return new Date().toISOString()
}

// ── Coffees ──────────────────────────────────────────────────────────────────

export function getAllCoffees(): Coffee[] {
  return getDb()
    .prepare('SELECT * FROM coffees WHERE deleted_at IS NULL ORDER BY last_modified DESC')
    .all() as Coffee[]
}

export function getCoffeeById(id: string): Coffee | undefined {
  return getDb()
    .prepare('SELECT * FROM coffees WHERE id = ? AND deleted_at IS NULL')
    .get(id) as Coffee | undefined
}

export function getMostRecentCoffee(): Coffee | undefined {
  return getDb()
    .prepare('SELECT * FROM coffees WHERE is_active = 1 AND deleted_at IS NULL ORDER BY last_modified DESC LIMIT 1')
    .get() as Coffee | undefined
}

export type CreateCoffeeInput = Omit<Coffee, 'id' | 'created_at' | 'last_modified' | 'synced_at' | 'deleted_at'>

export function createCoffee(id: string, input: CreateCoffeeInput): Coffee {
  const ts = now()
  getDb().prepare(`
    INSERT INTO coffees
      (id, name, roaster, origin, roast_date, purchase_date, net_weight_g, notes, is_active, created_at, last_modified)
    VALUES
      (@id, @name, @roaster, @origin, @roast_date, @purchase_date, @net_weight_g, @notes, @is_active, @created_at, @last_modified)
  `).run({ id, ...input, created_at: ts, last_modified: ts })
  return getCoffeeById(id)!
}

export type UpdateCoffeeInput = Partial<Omit<Coffee, 'id' | 'created_at' | 'synced_at'>>

export function updateCoffee(id: string, input: UpdateCoffeeInput): Coffee | undefined {
  const existing = getCoffeeById(id)
  if (!existing) return undefined
  const row = { ...existing, ...input, last_modified: now() }
  getDb().prepare(`
    UPDATE coffees SET
      name = @name, roaster = @roaster, origin = @origin,
      roast_date = @roast_date, purchase_date = @purchase_date,
      net_weight_g = @net_weight_g, notes = @notes,
      is_active = @is_active, last_modified = @last_modified
    WHERE id = @id
  `).run(row)
  return getCoffeeById(id)
}

export function deleteCoffee(id: string): boolean {
  const ts = now()
  return getDb()
    .prepare('UPDATE coffees SET deleted_at = ?, last_modified = ?, synced_at = NULL WHERE id = ? AND deleted_at IS NULL')
    .run(ts, ts, id).changes > 0
}

// ── Grind Profiles ────────────────────────────────────────────────────────────

export function getGrindProfilesForCoffee(coffeeId: string): GrindProfile[] {
  return getDb()
    .prepare('SELECT * FROM grind_profiles WHERE coffee_id = ? ORDER BY created_at ASC')
    .all(coffeeId) as GrindProfile[]
}

export type CreateGrindInput = Omit<GrindProfile, 'id' | 'created_at' | 'last_modified' | 'synced_at'>

export function createGrindProfile(id: string, input: CreateGrindInput): GrindProfile {
  const ts = now()
  getDb().prepare(`
    INSERT INTO grind_profiles
      (id, coffee_id, basket_type, dosage_g, grind_size, water_amount_ml, notes, created_at, last_modified)
    VALUES
      (@id, @coffee_id, @basket_type, @dosage_g, @grind_size, @water_amount_ml, @notes, @created_at, @last_modified)
  `).run({ id, ...input, created_at: ts, last_modified: ts })
  return getDb().prepare('SELECT * FROM grind_profiles WHERE id = ?').get(id) as GrindProfile
}

export type UpdateGrindInput = Partial<Omit<GrindProfile, 'id' | 'coffee_id' | 'created_at' | 'synced_at'>>

export function updateGrindProfile(id: string, input: UpdateGrindInput): GrindProfile | undefined {
  const existing = getDb()
    .prepare('SELECT * FROM grind_profiles WHERE id = ?')
    .get(id) as GrindProfile | undefined
  if (!existing) return undefined
  const row = { ...existing, ...input, last_modified: now() }
  getDb().prepare(`
    UPDATE grind_profiles SET
      basket_type = @basket_type, dosage_g = @dosage_g, grind_size = @grind_size,
      water_amount_ml = @water_amount_ml, notes = @notes, last_modified = @last_modified
    WHERE id = @id
  `).run(row)
  return getDb().prepare('SELECT * FROM grind_profiles WHERE id = ?').get(id) as GrindProfile
}

export function deleteGrindProfile(id: string): boolean {
  return getDb().prepare('DELETE FROM grind_profiles WHERE id = ?').run(id).changes > 0
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | undefined {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, value)
}
