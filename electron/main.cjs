const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage, powerMonitor, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

// Bells are unattended playback by design. Allow scheduled audio without a
// recent click, including when the application is hidden in the system tray.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let tray = null;
let autoLauncher = null;

const isDev = !app.isPackaged;

// Persistent schedule state
let schedule = {
  bells: [], // { id, name, time, repeatDays, enabled, profileEnabled, soundId }
  masterEnabled: true,
};

// Execution dedup: bellId|localDate|HH:mm
const firedToday = new Set();
let lastFiredDate = '';

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDayOfWeek() {
  return new Date().getDay();
}

function createWindow() {
  const appIcon = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '..', 'build', 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    show: false,
    frame: true,
    backgroundColor: '#0f172a',
    icon: fs.existsSync(appIcon) ? appIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('[Electron] Loading packaged renderer:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL) => console.error('[Electron] Renderer failed to load', { code, description, validatedURL }));
  mainWindow.webContents.on('render-process-gone', (_event, details) => console.error('[Electron] Renderer process ended', details));
  mainWindow.webContents.on('preload-error', (_event, path, error) => console.error('[Electron] Preload failed', path, error));

  mainWindow.once('ready-to-show', () => {
    const settings = getSettings();
    if (!settings.startMinimized) mainWindow.show();
  });

  // Close to tray instead of quitting
  mainWindow.on('close', (e) => {
    const settings = getSettings();
    if (settings.minimizeToTray && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Simple settings persistence
const settingsPath = path.join(app.getPath('userData'), 'electron-settings.json');
let settingsStore = { masterAlarmsEnabled: true, minimizeToTray: true, startMinimized: false, launchOnStartup: false };

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      settingsStore = { ...settingsStore, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function saveSettings(patch) {
  settingsStore = { ...settingsStore, ...patch };
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settingsStore, null, 2));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function getSettings() {
  return settingsStore;
}

// Sound cache directory
const soundCacheDir = path.join(app.getPath('userData'), 'sound-cache');
function ensureSoundCache() {
  if (!fs.existsSync(soundCacheDir)) {
    fs.mkdirSync(soundCacheDir, { recursive: true });
  }
}

function getDefaultBellPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sounds', 'default-bell.wav');
  }
  return path.join(__dirname, '..', 'public', 'sounds', 'default-bell.wav');
}

function getCachedSoundPath(soundId, ext) {
  return path.join(soundCacheDir, `${soundId}.${ext || 'wav'}`);
}

// Calculate next upcoming bell
function getNextBell() {
  if (!schedule.masterEnabled) return null;
  const nowHHmm = getHHmm();
  const today = getDayOfWeek();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDay = (today + dayOffset) % 7;
    const eligible = schedule.bells
      .filter((b) => b.enabled && b.profileEnabled)
      .filter((b) => !b.repeatDays || b.repeatDays.length === 0 || b.repeatDays.includes(checkDay))
      .filter((b) => dayOffset > 0 || b.time > nowHHmm)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (eligible.length > 0) return eligible[0];
  }
  return null;
}

function buildTrayMenu() {
  const next = getNextBell();
  const master = schedule.masterEnabled;
  return Menu.buildFromTemplate([
    { label: 'School Bell Manager', enabled: false },
    { type: 'separator' },
    {
      label: 'Open School Bell Manager',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: `Master Alarms: ${master ? 'On' : 'Off'}`,
      type: 'checkbox',
      checked: master,
      click: (item) => {
        schedule.masterEnabled = item.checked;
        saveSettings({ masterAlarmsEnabled: item.checked });
        mainWindow?.webContents.send('master-toggled', item.checked);
        updateTray();
      },
    },
    { type: 'separator' },
    { label: 'Next Bell:', enabled: false },
    { label: next ? `${next.name} - ${next.time}` : 'No upcoming bells', enabled: false },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function updateTray() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
  const next = getNextBell();
  const tooltip = `School Bell Manager — ${next ? `Next: ${next.name} ${next.time}` : 'No upcoming bells'}`;
  tray.setToolTip(tooltip);
}

// Bell execution
function tickBells() {
  // Clear fired set at midnight
  const today = getLocalDateStr();
  if (today !== lastFiredDate) {
    firedToday.clear();
    lastFiredDate = today;
  }

  if (!schedule.masterEnabled) return;

  const hhmm = getHHmm();
  const dayOfWeek = getDayOfWeek();

  for (const b of schedule.bells) {
    if (!b.enabled || !b.profileEnabled) continue;
    if (b.time !== hhmm) continue;
    if (b.repeatDays && b.repeatDays.length !== 0 && !b.repeatDays.includes(dayOfWeek)) continue;

    const key = `${b.id}|${today}|${hhmm}`;
    if (firedToday.has(key)) continue;
    firedToday.add(key);

    console.log(`[Electron Scheduler] Alarm became due: ${b.name} at ${hhmm}`);

    // The renderer owns sound resolution (IndexedDB/Firestore and the bundled
    // default sound). Tell it exactly which bell became due so it can play the
    // configured sound even while the window is hidden in the tray.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bell-fired', b.id);
    } else {
      console.warn('[Electron Scheduler] Cannot play bell because the renderer is unavailable:', b.id);
    }

    // Show notification
    if (Notification.isSupported()) {
      new Notification({ title: 'School Bell', body: b.name }).show();
    }
  }
}

function playBellSound(soundId) {
  try {
    if (soundId === '__default_bell__' || !soundId) {
      const defaultPath = getDefaultBellPath();
      if (fs.existsSync(defaultPath)) {
        playAudioFile(defaultPath);
      } else {
        console.warn('[Electron] Default bell sound not found at:', defaultPath);
      }
      return;
    }

    // Check sound cache for custom sounds
  const exts = ['mp3', 'wav', 'ogg'];
  for (const ext of exts) {
    const cachedPath = getCachedSoundPath(soundId, ext);
    if (fs.existsSync(cachedPath)) {
      playAudioFile(cachedPath);
      return;
    }
  }

    // Fallback to default
    console.warn('[Electron] Cached sound not found for', soundId, '— using default');
    const defaultPath = getDefaultBellPath();
    if (fs.existsSync(defaultPath)) {
      playAudioFile(defaultPath);
    }
  } catch (e) {
    console.error('[Electron] Sound playback error:', e);
  }
}

function playAudioFile(filePath) {
  // Use the renderer to play audio (reliable in Electron)
  // We send the file path to the renderer which creates an Audio element
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-sound-file', 'file://' + filePath);
  } else {
    // Window not available — use a simple shell approach as fallback
    console.log('[Electron] Playing sound (no window):', filePath);
  }
}

// IPC handlers
ipcMain.handle('set-auto-launch', (e, enabled) => {
  if (!autoLauncher) return;
  return autoLauncher[enabled ? 'enable' : 'disable']().catch((err) => {
    console.error('Auto-launch error:', err);
  });
});

ipcMain.on('minimize-to-tray', () => mainWindow?.hide());
ipcMain.on('restore-window', () => mainWindow?.show());
ipcMain.on('quit', () => { app.isQuitting = true; app.quit(); });
ipcMain.on('open-external', (e, url) => { if (typeof url === 'string' && /^https:\/\//.test(url)) shell.openExternal(url); });

ipcMain.on('update-tray', (e, data) => {
  schedule.masterEnabled = data.masterEnabled;
  saveSettings({ masterAlarmsEnabled: data.masterEnabled });
  updateTray();
});

ipcMain.on('schedule-bells', (e, data) => {
  schedule = { bells: data.bells, masterEnabled: data.masterEnabled };
  updateTray();
  console.log('[Electron] Schedule updated:', data.bells.length, 'bells, master:', data.masterEnabled);
  // A schedule can arrive after the minute started (for example just after
  // startup). Evaluate it immediately instead of waiting for the next poll.
  tickBells();
});

// Cache sound file from renderer (base64 data)
ipcMain.handle('cache-sound', (e, { soundId, base64Data, ext }) => {
  ensureSoundCache();
  const filePath = getCachedSoundPath(soundId, ext);
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log('[Electron] Cached sound:', soundId, '->', filePath);
    return true;
  } catch (err) {
    console.error('[Electron] Failed to cache sound:', err);
    return false;
  }
});

// Handle sound file playback from main process
ipcMain.on('play-sound-file-response', (e, { success, error }) => {
  if (!success) {
    console.warn('[Electron] Renderer audio playback reported failure:', error);
  }
});

app.whenReady().then(() => {
  loadSettings();
  ensureSoundCache();
  createWindow();

  // Create tray icon
  const trayIconPath = app.isPackaged ? path.join(process.resourcesPath, 'tray.ico') : path.join(__dirname, '..', 'build', 'tray.ico');
  const icon = fs.existsSync(trayIconPath) ? nativeImage.createFromPath(trayIconPath) : nativeImage.createEmpty();
  tray = new Tray(icon);
  updateTray();
  tray.on('click', () => mainWindow?.show());
  tray.on('double-click', () => mainWindow?.show());

  // Auto-launch
  autoLauncher = new AutoLaunch({ name: 'School Bell Manager' });

  // Apply startup setting
  if (settingsStore.launchOnStartup) {
    autoLauncher.enable().catch(() => {});
  }

  // Check every second so an HH:mm alarm rings close to second zero rather
  // than as much as 15 seconds late.
  lastFiredDate = getLocalDateStr();
  setInterval(tickBells, 1000);
  tickBells(); // immediate check

  // Recalculate after sleep/wake
  powerMonitor.on('resume', () => {
    console.log('[Electron] System resumed from sleep — recalculating schedule');
    firedToday.clear();
    lastFiredDate = getLocalDateStr();
    tickBells();
    updateTray();
  });

  powerMonitor.on('suspend', () => {
    console.log('[Electron] System suspending');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep tray alive on all platforms
  if (process.platform === 'darwin') {
    // macOS: don't quit
  }
});

// Allow clean exit on OS shutdown
app.on('before-quit', () => {
  app.isQuitting = true;
});

process.on('uncaughtException', (error) => console.error('[Electron] Uncaught main-process error:', error));
process.on('unhandledRejection', (reason) => console.error('[Electron] Unhandled main-process rejection:', reason));
