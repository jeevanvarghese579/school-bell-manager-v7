import type { BellProfile, Bell, BellSound, AppSettings } from '@/models/types';
import { DEFAULT_SETTINGS } from '@/models/types';

const DB_NAME = 'school-bell-manager';
const DB_VERSION = 1;
const STORES = {
  profiles: 'profiles',
  bells: 'bells',
  sounds: 'sounds',
  soundBlobs: 'soundBlobs',
  settings: 'settings',
  cache: 'cache',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.profiles)) {
        db.createObjectStore(STORES.profiles, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.bells)) {
        db.createObjectStore(STORES.bells, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.sounds)) {
        db.createObjectStore(STORES.sounds, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.soundBlobs)) {
        db.createObjectStore(STORES.soundBlobs);
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings);
      }
      if (!db.objectStoreNames.contains(STORES.cache)) {
        db.createObjectStore(STORES.cache);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const r = fn(s);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

function getAll<T>(store: string): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}
function getOne<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return tx<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>);
}
function put<T>(store: string, val: T): Promise<void> {
  return tx(store, 'readwrite', (s) => s.put(val as unknown as object)).then(() => undefined);
}
function putKey<T>(store: string, key: IDBValidKey, val: T): Promise<void> {
  return tx(store, 'readwrite', (s) => s.put(val as unknown as object, key)).then(() => undefined);
}
function del(store: string, key: IDBValidKey): Promise<void> {
  return tx(store, 'readwrite', (s) => s.delete(key)).then(() => undefined);
}
function clearStore(store: string): Promise<void> {
  return tx(store, 'readwrite', (s) => s.clear()).then(() => undefined);
}

export const idb = {
  // profiles
  getProfiles: () => getAll<BellProfile>(STORES.profiles),
  putProfile: (p: BellProfile) => put(STORES.profiles, p),
  deleteProfile: (id: string) => del(STORES.profiles, id),

  // bells
  getBells: () => getAll<Bell>(STORES.bells),
  putBell: (b: Bell) => put(STORES.bells, b),
  deleteBell: (id: string) => del(STORES.bells, id),
  deleteBellsByProfile: async (profileId: string) => {
    const all = await getAll<Bell>(STORES.bells);
    await Promise.all(all.filter((b) => b.profileId === profileId).map((b) => del(STORES.bells, b.id)));
  },

  // sounds metadata
  getSounds: () => getAll<BellSound>(STORES.sounds),
  putSound: (s: BellSound) => put(STORES.sounds, s),
  deleteSound: (id: string) => del(STORES.sounds, id),

  // sound blobs (keyed by sound id)
  getSoundBlob: (id: string) => getOne<Blob>(STORES.soundBlobs, id),
  putSoundBlob: (id: string, blob: Blob) => putKey(STORES.soundBlobs, id, blob),
  deleteSoundBlob: (id: string) => del(STORES.soundBlobs, id),

  // settings (single row keyed 'app')
  getSettings: async (): Promise<AppSettings> => {
    const s = await getOne<AppSettings>(STORES.settings, 'app');
    return s ?? DEFAULT_SETTINGS;
  },
  putSettings: (s: AppSettings) => putKey(STORES.settings, 'app', s),

  // cache helpers (for cloud users)
  cacheGet: <T>(key: string) => getOne<T>(STORES.cache, key),
  cachePut: <T>(key: string, val: T) => putKey(STORES.cache, key, val),

  clearAll: async () => {
    await Promise.all([
      clearStore(STORES.profiles),
      clearStore(STORES.bells),
      clearStore(STORES.sounds),
      clearStore(STORES.soundBlobs),
    ]);
  },

  hasLocalData: async (): Promise<boolean> => {
    const [p, b, s] = await Promise.all([
      getAll<BellProfile>(STORES.profiles),
      getAll<Bell>(STORES.bells),
      getAll<BellSound>(STORES.sounds),
    ]);
    return p.length > 0 || b.length > 0 || s.length > 0;
  },
};
