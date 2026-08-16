import type { BellProfile, Bell, BellSound, AppSettings } from '@/models/types';
import { DEFAULT_SETTINGS } from '@/models/types';
import type { DataProvider } from './DataProvider';
import { idb } from '@/storage/indexeddb';
import { uid } from '@/utils/id';

function now(): number {
  return Date.now();
}

export class OfflineProvider implements DataProvider {
  mode = 'offline' as const;

  async getProfiles(): Promise<BellProfile[]> {
    const p = await idb.getProfiles();
    return p.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  }

  async createProfile(name: string): Promise<BellProfile> {
    const p: BellProfile = {
      id: uid(),
      name,
      enabled: true,
      sortOrder: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await idb.putProfile(p);
    return p;
  }

  async updateProfile(id: string, patch: Partial<BellProfile>): Promise<void> {
    const p = (await idb.getProfiles()).find((x) => x.id === id);
    if (!p) return;
    await idb.putProfile({ ...p, ...patch, updatedAt: now() });
  }

  async deleteProfile(id: string): Promise<void> {
    await idb.deleteBellsByProfile(id);
    await idb.deleteProfile(id);
  }

  async duplicateProfile(id: string): Promise<BellProfile | null> {
    const src = (await idb.getProfiles()).find((x) => x.id === id);
    if (!src) return null;
    const copy: BellProfile = {
      ...src,
      id: uid(),
      name: `${src.name} Copy`,
      createdAt: now(),
      updatedAt: now(),
    };
    await idb.putProfile(copy);
    const bells = (await idb.getBells()).filter((b) => b.profileId === id);
    for (const b of bells) {
      await idb.putBell({ ...b, id: uid(), profileId: copy.id, createdAt: now(), updatedAt: now() });
    }
    return copy;
  }

  async getBells(profileId: string): Promise<Bell[]> {
    const all = await idb.getBells();
    return all
      .filter((b) => b.profileId === profileId)
      .sort((a, b) => a.time.localeCompare(b.time) || a.sortOrder - b.sortOrder);
  }

  async createBell(profileId: string, data: Partial<Bell>): Promise<Bell> {
    const b: Bell = {
      id: uid(),
      profileId,
      name: data.name ?? 'Bell',
      time: data.time ?? '08:00',
      repeatDays: data.repeatDays ?? [],
      soundId: data.soundId ?? null,
      enabled: data.enabled ?? true,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await idb.putBell(b);
    return b;
  }

  async updateBell(id: string, patch: Partial<Bell>): Promise<void> {
    const all = await idb.getBells();
    const b = all.find((x) => x.id === id);
    if (!b) return;
    await idb.putBell({ ...b, ...patch, updatedAt: now() });
  }

  async deleteBell(id: string): Promise<void> {
    await idb.deleteBell(id);
  }

  async getSounds(): Promise<BellSound[]> {
    const s = await idb.getSounds();
    return s.sort((a, b) => a.createdAt - b.createdAt);
  }

  async addSound(name: string, file: File): Promise<BellSound> {
    const id = uid();
    const s: BellSound = {
      id,
      name,
      storagePath: id,
      mimeType: file.type || 'audio/mpeg',
      size: file.size,
      createdAt: now(),
    };
    await idb.putSound(s);
    await idb.putSoundBlob(id, file);
    return s;
  }

  async deleteSound(id: string): Promise<void> {
    await idb.deleteSound(id);
    await idb.deleteSoundBlob(id);
  }

  async updateSound(id: string, name: string): Promise<void> {
    const all = await idb.getSounds();
    const s = all.find((x) => x.id === id);
    if (!s) return;
    await idb.putSound({ ...s, name });
  }

  async getSoundUrl(id: string): Promise<string | null> {
    const blob = await idb.getSoundBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  async getSettings(): Promise<AppSettings> {
    return idb.getSettings();
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<void> {
    const cur = await idb.getSettings();
    await idb.putSettings({ ...cur, ...patch });
  }
}

export const offlineProvider = new OfflineProvider();
export { DEFAULT_SETTINGS };
