import type { AppSettings } from '@/models/types';
import type { SchedulableBell } from '@/utils/time';

interface ElectronAPI {
  isElectron: true;
  platform: string;
  setAutoLaunch: (enabled: boolean) => Promise<void>;
  minimizeToTray: () => void;
  restoreWindow: () => void;
  quit: () => void;
  openExternal: (url: string) => void;
  updateTray: (data: {
    masterEnabled: boolean;
    nextBell: { name: string; time: string } | null;
  }) => void;
  onToggleMaster: (cb: (enabled: boolean) => void) => void;
  onTrayOpen: (cb: () => void) => void;
  scheduleBells: (bells: SchedulableBell[], settings: AppSettings) => void;
  onBellFired: (cb: (bellId: string) => void) => () => void;
  cacheSound: (soundId: string, base64Data: string, ext: string) => Promise<boolean>;
  onPlaySoundFile: (cb: (filePath: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return Boolean(window.electronAPI?.isElectron);
}

export function getElectron(): ElectronAPI | null {
  return window.electronAPI ?? null;
}
