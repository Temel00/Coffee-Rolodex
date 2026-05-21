-- Run this in the Supabase SQL editor to mirror the local SQLite schema.
-- Supabase uses PostgreSQL, so is_active is BOOLEAN and timestamps are TIMESTAMPTZ.
-- The sync layer converts between SQLite integer (0/1) and PostgreSQL boolean automatically.

CREATE TABLE IF NOT EXISTS coffees (
  id             TEXT        PRIMARY KEY,
  name           TEXT        NOT NULL,
  roaster        TEXT        NOT NULL DEFAULT '',
  origin         TEXT        NOT NULL DEFAULT '',
  roast_date     TEXT,
  purchase_date  TEXT,
  net_weight_g   REAL,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TEXT        NOT NULL,
  last_modified  TEXT        NOT NULL,
  synced_at      TEXT
);

CREATE TABLE IF NOT EXISTS grind_profiles (
  id             TEXT        PRIMARY KEY,
  coffee_id      TEXT        NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
  basket_type    TEXT        NOT NULL DEFAULT '',
  dosage_g       REAL,
  grind_size     TEXT,
  water_amount_ml REAL,
  notes          TEXT,
  created_at     TEXT        NOT NULL,
  last_modified  TEXT        NOT NULL,
  synced_at      TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coffees_last_modified    ON coffees(last_modified);
CREATE INDEX IF NOT EXISTS idx_coffees_is_active        ON coffees(is_active);
CREATE INDEX IF NOT EXISTS idx_grind_profiles_coffee_id ON grind_profiles(coffee_id);
CREATE INDEX IF NOT EXISTS idx_grind_profiles_last_mod  ON grind_profiles(last_modified);

-- Row-level security: enable and allow all for the anon key (adjust as needed)
ALTER TABLE coffees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE grind_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON coffees        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON grind_profiles FOR ALL USING (true) WITH CHECK (true);
