const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  restoreWindow: () => ipcRenderer.send('restore-window'),
  quit: () => ipcRenderer.send('quit'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  updateTray: (data) => ipcRenderer.send('update-tray', data),
  onToggleMaster: (cb) => ipcRenderer.on('master-toggled', (e, enabled) => cb(enabled)),
  onTrayOpen: (cb) => ipcRenderer.on('tray-open', () => cb()),
  scheduleBells: (bells, settings) =>
    ipcRenderer.send('schedule-bells', { bells, masterEnabled: settings.masterAlarmsEnabled }),
  onBellFired: (cb) => {
    const listener = (e, bellId) => cb(bellId);
    ipcRenderer.on('bell-fired', listener);
    return () => ipcRenderer.removeListener('bell-fired', listener);
  },
  // Sound caching for Electron main process playback
  cacheSound: (soundId, base64Data, ext) =>
    ipcRenderer.invoke('cache-sound', { soundId, base64Data, ext }),
  // Main process asks renderer to play a file:// sound
  onPlaySoundFile: (cb) => ipcRenderer.on('play-sound-file', (e, filePath) => cb(filePath)),
});
