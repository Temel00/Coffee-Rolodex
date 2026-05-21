"use strict";
const electron = require("electron");
const path = require("path");
const dotenv = require("dotenv");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const supabaseJs = require("@supabase/supabase-js");
const WebSocket = require("ws");
let _db = null;
function getDb() {
  if (!_db) {
    const dbPath = path.join(electron.app.getPath("userData"), "coffee-rolodex.db");
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}
function initSchema(db) {
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
  `);
  try {
    db.exec("ALTER TABLE coffees ADD COLUMN deleted_at TEXT");
  } catch {
  }
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function getAllCoffees() {
  return getDb().prepare("SELECT * FROM coffees WHERE deleted_at IS NULL ORDER BY last_modified DESC").all();
}
function getCoffeeById(id) {
  return getDb().prepare("SELECT * FROM coffees WHERE id = ? AND deleted_at IS NULL").get(id);
}
function getMostRecentCoffee() {
  return getDb().prepare("SELECT * FROM coffees WHERE is_active = 1 AND deleted_at IS NULL ORDER BY last_modified DESC LIMIT 1").get();
}
function createCoffee(id, input) {
  const ts = now();
  getDb().prepare(`
    INSERT INTO coffees
      (id, name, roaster, origin, roast_date, purchase_date, net_weight_g, notes, is_active, created_at, last_modified)
    VALUES
      (@id, @name, @roaster, @origin, @roast_date, @purchase_date, @net_weight_g, @notes, @is_active, @created_at, @last_modified)
  `).run({ id, ...input, created_at: ts, last_modified: ts });
  return getCoffeeById(id);
}
function updateCoffee(id, input) {
  const existing = getCoffeeById(id);
  if (!existing) return void 0;
  const row = { ...existing, ...input, last_modified: now() };
  getDb().prepare(`
    UPDATE coffees SET
      name = @name, roaster = @roaster, origin = @origin,
      roast_date = @roast_date, purchase_date = @purchase_date,
      net_weight_g = @net_weight_g, notes = @notes,
      is_active = @is_active, last_modified = @last_modified
    WHERE id = @id
  `).run(row);
  return getCoffeeById(id);
}
function deleteCoffee(id) {
  const ts = now();
  return getDb().prepare("UPDATE coffees SET deleted_at = ?, last_modified = ?, synced_at = NULL WHERE id = ? AND deleted_at IS NULL").run(ts, ts, id).changes > 0;
}
function getGrindProfilesForCoffee(coffeeId) {
  return getDb().prepare("SELECT * FROM grind_profiles WHERE coffee_id = ? ORDER BY created_at ASC").all(coffeeId);
}
function createGrindProfile(id, input) {
  const ts = now();
  getDb().prepare(`
    INSERT INTO grind_profiles
      (id, coffee_id, basket_type, dosage_g, grind_size, water_amount_ml, notes, created_at, last_modified)
    VALUES
      (@id, @coffee_id, @basket_type, @dosage_g, @grind_size, @water_amount_ml, @notes, @created_at, @last_modified)
  `).run({ id, ...input, created_at: ts, last_modified: ts });
  return getDb().prepare("SELECT * FROM grind_profiles WHERE id = ?").get(id);
}
function updateGrindProfile(id, input) {
  const existing = getDb().prepare("SELECT * FROM grind_profiles WHERE id = ?").get(id);
  if (!existing) return void 0;
  const row = { ...existing, ...input, last_modified: now() };
  getDb().prepare(`
    UPDATE grind_profiles SET
      basket_type = @basket_type, dosage_g = @dosage_g, grind_size = @grind_size,
      water_amount_ml = @water_amount_ml, notes = @notes, last_modified = @last_modified
    WHERE id = @id
  `).run(row);
  return getDb().prepare("SELECT * FROM grind_profiles WHERE id = ?").get(id);
}
function deleteGrindProfile(id) {
  return getDb().prepare("DELETE FROM grind_profiles WHERE id = ?").run(id).changes > 0;
}
function getSetting(key) {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value;
}
function setSetting(key, value) {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
if (!("WebSocket" in globalThis)) {
  Object.assign(globalThis, { WebSocket });
}
let _supabase = null;
let _syncing = false;
let _mainWindow = null;
function configureSyncWindow(win) {
  _mainWindow = win;
}
function configureSupabase(url, key) {
  _supabase = supabaseJs.createClient(url, key);
}
function isSyncing() {
  return _syncing;
}
function send(state) {
  _mainWindow?.webContents.send("sync:status", state);
}
async function sync() {
  if (_syncing || !_supabase) return;
  _syncing = true;
  send({ status: "syncing", lastSyncAt: getSetting("last_sync_at") ?? null, error: null });
  try {
    const db = getDb();
    const lastSyncAt = getSetting("last_sync_at") ?? "1970-01-01T00:00:00.000Z";
    const syncTime = (/* @__PURE__ */ new Date()).toISOString();
    const pendingDeletes = db.prepare(`SELECT * FROM coffees WHERE deleted_at IS NOT NULL AND (synced_at IS NULL OR last_modified > synced_at)`).all();
    const dirtyCofffees = db.prepare(`SELECT * FROM coffees WHERE deleted_at IS NULL AND (synced_at IS NULL OR last_modified > synced_at)`).all();
    const dirtyProfiles = db.prepare(`SELECT * FROM grind_profiles WHERE synced_at IS NULL OR last_modified > synced_at`).all();
    if (pendingDeletes.length > 0) {
      const ids = pendingDeletes.map((c) => c.id);
      const { error } = await _supabase.from("coffees").delete().in("id", ids);
      if (!error) {
        const del = db.prepare("DELETE FROM coffees WHERE id = ?");
        for (const c of pendingDeletes) del.run(c.id);
      }
    }
    if (dirtyCofffees.length > 0) {
      const rows = dirtyCofffees.map(({ deleted_at: _, ...c }) => ({ ...c, is_active: c.is_active === 1 }));
      const { error } = await _supabase.from("coffees").upsert(rows);
      if (!error) {
        const stmt = db.prepare("UPDATE coffees SET synced_at = ? WHERE id = ?");
        for (const c of dirtyCofffees) stmt.run(c.last_modified, c.id);
      }
    }
    if (dirtyProfiles.length > 0) {
      const { error } = await _supabase.from("grind_profiles").upsert(dirtyProfiles);
      if (!error) {
        const stmt = db.prepare("UPDATE grind_profiles SET synced_at = ? WHERE id = ?");
        for (const p of dirtyProfiles) stmt.run(p.last_modified, p.id);
      }
    }
    const { data: remoteCoffees } = await _supabase.from("coffees").select("*").gt("last_modified", lastSyncAt);
    if (remoteCoffees && remoteCoffees.length > 0) {
      const upsert = db.prepare(`
        INSERT OR REPLACE INTO coffees
          (id, name, roaster, origin, roast_date, purchase_date, net_weight_g,
           notes, is_active, created_at, last_modified, synced_at, deleted_at)
        VALUES
          (@id, @name, @roaster, @origin, @roast_date, @purchase_date, @net_weight_g,
           @notes, @is_active, @created_at, @last_modified, @synced_at, @deleted_at)
      `);
      for (const r of remoteCoffees) {
        const local = db.prepare("SELECT last_modified FROM coffees WHERE id = ?").get(r.id);
        if (!local || r.last_modified > local.last_modified) {
          upsert.run({ ...r, is_active: r.is_active ? 1 : 0, synced_at: r.last_modified, deleted_at: null });
        }
      }
    }
    const { data: remoteProfiles } = await _supabase.from("grind_profiles").select("*").gt("last_modified", lastSyncAt);
    if (remoteProfiles && remoteProfiles.length > 0) {
      const upsert = db.prepare(`
        INSERT OR REPLACE INTO grind_profiles
          (id, coffee_id, basket_type, dosage_g, grind_size, water_amount_ml,
           notes, created_at, last_modified, synced_at)
        VALUES
          (@id, @coffee_id, @basket_type, @dosage_g, @grind_size, @water_amount_ml,
           @notes, @created_at, @last_modified, @synced_at)
      `);
      for (const r of remoteProfiles) {
        const local = db.prepare("SELECT last_modified FROM grind_profiles WHERE id = ?").get(r.id);
        if (!local || r.last_modified > local.last_modified) {
          upsert.run({ ...r, synced_at: r.last_modified });
        }
      }
    }
    setSetting("last_sync_at", syncTime);
    send({ status: "success", lastSyncAt: syncTime, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    send({ status: "error", lastSyncAt: getSetting("last_sync_at") ?? null, error: message });
  } finally {
    _syncing = false;
  }
}
function syncInBackground() {
  sync().catch(() => {
  });
}
function registerIpcHandlers() {
  electron.ipcMain.handle("coffee:getAll", () => getAllCoffees());
  electron.ipcMain.handle("coffee:getById", (_e, id) => getCoffeeById(id) ?? null);
  electron.ipcMain.handle("coffee:getMostRecent", () => getMostRecentCoffee() ?? null);
  electron.ipcMain.handle(
    "coffee:create",
    (_e, input) => createCoffee(crypto.randomUUID(), input)
  );
  electron.ipcMain.handle(
    "coffee:update",
    (_e, id, input) => updateCoffee(id, input) ?? null
  );
  electron.ipcMain.handle("coffee:delete", (_e, id) => deleteCoffee(id));
  electron.ipcMain.handle(
    "grind:getForCoffee",
    (_e, coffeeId) => getGrindProfilesForCoffee(coffeeId)
  );
  electron.ipcMain.handle(
    "grind:create",
    (_e, input) => createGrindProfile(crypto.randomUUID(), input)
  );
  electron.ipcMain.handle(
    "grind:update",
    (_e, id, input) => updateGrindProfile(id, input) ?? null
  );
  electron.ipcMain.handle("grind:delete", (_e, id) => deleteGrindProfile(id));
  electron.ipcMain.handle("sync:trigger", () => sync());
  electron.ipcMain.handle("sync:getLastSyncAt", () => getSetting("last_sync_at") ?? null);
  electron.ipcMain.handle("sync:isSyncing", () => isSyncing());
}
if (electron.app.isPackaged) {
  dotenv.config({ path: path.join(electron.app.getPath("userData"), ".env") });
} else {
  dotenv.config();
}
const isDev = !electron.app.isPackaged;
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: !isDev,
    kiosk: !isDev,
    frame: isDev,
    autoHideMenuBar: true,
    backgroundColor: "#0f0906",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (isDev) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  configureSyncWindow(mainWindow);
}
function setupSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url && key) configureSupabase(url, key);
}
let syncInterval = null;
function startSyncTimer() {
  syncInterval = setInterval(() => syncInBackground(), 15 * 60 * 1e3);
}
electron.app.whenReady().then(() => {
  setupSupabase();
  registerIpcHandlers();
  createWindow();
  syncInBackground();
  startSyncTimer();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("before-quit", (event) => {
  if (isSyncing()) return;
  event.preventDefault();
  if (syncInterval) clearInterval(syncInterval);
  Promise.race([
    sync(),
    new Promise((res) => setTimeout(res, 5e3))
  ]).finally(() => electron.app.exit(0));
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
