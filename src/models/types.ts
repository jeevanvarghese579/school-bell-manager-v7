export type ID = string;

export interface BellProfile {
  id: ID;
  name: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Bell {
  id: ID;
  profileId: ID;
  name: string;
  time: string; // "HH:mm" 24h
  repeatDays: number[]; // 0=Sun..6=Sat; [] = once
  soundId: string | null;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface BellSound {
  id: ID;
  name: string;
  storagePath: string; // cloud path OR IndexedDB key
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  masterAlarmsEnabled: boolean;
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  masterAlarmsEnabled: true,
  launchOnStartup: false,
  minimizeToTray: true,
  startMinimized: false,
};

export const DEFAULT_BELL_SOUND_ID = '__default_bell__';
export const DEFAULT_BELL_SOUND_NAME = 'Default Bell';
