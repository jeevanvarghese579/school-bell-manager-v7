import type { BellProfile, Bell, BellSound, AppSettings } from '@/models/types';

export interface DataProvider {
  mode: 'offline' | 'cloud';

  // profiles
  getProfiles(): Promise<BellProfile[]>;
  createProfile(name: string): Promise<BellProfile>;
  updateProfile(id: string, patch: Partial<BellProfile>): Promise<void>;
  deleteProfile(id: string): Promise<void>;
  duplicateProfile(id: string): Promise<BellProfile | null>;

  // bells
  getBells(profileId: string): Promise<Bell[]>;
  createBell(profileId: string, data: Partial<Bell>): Promise<Bell>;
  updateBell(id: string, patch: Partial<Bell>): Promise<void>;
  deleteBell(id: string, profileId?: string): Promise<void>;

  // sounds
  getSounds(): Promise<BellSound[]>;
  addSound(name: string, file: File): Promise<BellSound>;
  updateSound(id: string, name: string): Promise<void>;
  deleteSound(id: string): Promise<void>;
  getSoundUrl(id: string): Promise<string | null>;

  // settings
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
}
