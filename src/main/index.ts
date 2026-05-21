import { app, BrowserWindow, shell } from "electron";
import { join, resolve } from "path";
import { config as loadEnv } from "dotenv";
import { registerIpcHandlers } from "./ipc-handlers";
import {
  configureSupabase,
  configureSyncWindow,
  syncInBackground,
  isSyncing,
  sync,
} from "./sync";

// Load .env — packaged app looks in userData, dev uses project root
if (app.isPackaged) {
  loadEnv({ path: join(app.getPath("userData"), ".env") });
} else {
  loadEnv();
}

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: !isDev,
    kiosk: !isDev,
    frame: isDev,
    autoHideMenuBar: true,
    backgroundColor: "#0f0906",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]!);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Open external links in the system browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  configureSyncWindow(mainWindow);
}

function setupSupabase(): void {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url && key) configureSupabase(url, key);
}

// 15-minute idle sync timer
let syncInterval: ReturnType<typeof setInterval> | null = null;

function startSyncTimer(): void {
  syncInterval = setInterval(() => syncInBackground(), 15 * 60 * 1000);
}

app.whenReady().then(() => {
  setupSupabase();
  registerIpcHandlers();
  createWindow();

  // Sync on launch (non-blocking)
  syncInBackground();
  startSyncTimer();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Sync on close (with 5-second timeout so the app always exits)
app.on("before-quit", (event) => {
  if (isSyncing()) return;
  event.preventDefault();
  if (syncInterval) clearInterval(syncInterval);
  Promise.race([
    sync(),
    new Promise<void>((res) => setTimeout(res, 5000)),
  ]).finally(() => app.exit(0));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
