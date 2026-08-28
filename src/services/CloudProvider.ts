import type { AppSettings, Bell, BellProfile, BellSound } from '@/models/types';
import { DEFAULT_SETTINGS } from '@/models/types';
import type { DataProvider } from './DataProvider';
import { firebaseAuth, firestore, storage } from '@/firebase/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocFromCache, getDocs, getDocsFromCache, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { idb } from '@/storage/indexeddb';

const userId = () => {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid || !firestore || !storage) throw new Error('You must be signed in to use cloud data.');
  return uid;
};
const stamp = (value: any) => value?.toMillis?.() ?? Date.now();
const profileFrom = (id: string, d: any): BellProfile => ({ id, name: d.name, enabled: d.enabled !== false, sortOrder: d.sortOrder ?? 0, createdAt: stamp(d.createdAt), updatedAt: stamp(d.updatedAt) });
const bellFrom = (profileId: string, id: string, d: any): Bell => ({ id, profileId, name: d.name, time: d.time, repeatDays: d.repeatDays ?? [], soundId: d.soundId ?? null, enabled: d.enabled !== false, sortOrder: d.sortOrder ?? 0, createdAt: stamp(d.createdAt), updatedAt: stamp(d.updatedAt) });
const soundFrom = (id: string, d: any): BellSound => ({ id, name: d.name, storagePath: d.storagePath, mimeType: d.mimeType, size: d.size, createdAt: stamp(d.createdAt) });
const offline = () => typeof navigator !== 'undefined' && !navigator.onLine;

export class CloudProvider implements DataProvider {
  mode = 'cloud' as const;
  private profiles() { const uid = userId(); return collection(firestore!, 'users', uid, 'profiles'); }
  private sounds() { const uid = userId(); return collection(firestore!, 'users', uid, 'sounds'); }
  async getProfiles() { const q = query(this.profiles(), orderBy('sortOrder')); const rows = offline() ? await getDocsFromCache(q) : await getDocs(q); return rows.docs.map(x => profileFrom(x.id, x.data())); }
  async createProfile(name: string) {
    const rows = await this.getProfiles();
    const createdAt = Date.now();
    const data = { name, enabled: true, sortOrder: rows.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const created = await addDoc(this.profiles(), data);
    // addDoc has already committed the write. Do not wait for a second read or
    // a snapshot before allowing the UI to render the newly created profile.
    return profileFrom(created.id, { ...data, createdAt, updatedAt: createdAt });
  }
  async updateProfile(id: string, patch: Partial<BellProfile>) { await updateDoc(doc(this.profiles(), id), { ...pick(patch, ['name', 'enabled', 'sortOrder']), updatedAt: serverTimestamp() }); }
  async deleteProfile(id: string) { const bells = await this.getBells(id); await Promise.all(bells.map(b => deleteDoc(doc(this.profiles(), id, 'bells', b.id)))); await deleteDoc(doc(this.profiles(), id)); }
  async duplicateProfile(id: string) { const source = (await this.getProfiles()).find(p => p.id === id); if (!source) return null; const copy = await this.createProfile(`${source.name} Copy`); const bells = await this.getBells(id); await Promise.all(bells.map(b => this.createBell(copy.id, b))); return copy; }
  async getBells(profileId: string) { const q = query(collection(this.profiles(), profileId, 'bells'), orderBy('time')); const rows = offline() ? await getDocsFromCache(q) : await getDocs(q); return rows.docs.map(x => bellFrom(profileId, x.id, x.data())); }
  async createBell(profileId: string, data: Partial<Bell>) {
    const createdAt = Date.now();
    const bell = { name: data.name ?? 'Bell', time: data.time ?? '08:00', repeatDays: data.repeatDays ?? [], soundId: data.soundId ?? null, enabled: data.enabled ?? true, sortOrder: data.sortOrder ?? 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const created = await addDoc(collection(this.profiles(), profileId, 'bells'), bell);
    // As with profiles, return the known write payload immediately. The next
    // refresh reconciles server timestamps without blocking the add operation.
    return bellFrom(profileId, created.id, { ...bell, createdAt, updatedAt: createdAt });
  }
  async updateBell(id: string, patch: Partial<Bell>) { const profiles = await this.getProfiles(); for (const p of profiles) { const target = doc(this.profiles(), p.id, 'bells', id); if ((await getDoc(target)).exists()) { await updateDoc(target, { ...pick(patch, ['name', 'time', 'repeatDays', 'soundId', 'enabled', 'sortOrder']), updatedAt: serverTimestamp() }); return; } } throw new Error('Bell not found.'); }
  async deleteBell(id: string) { const profiles = await this.getProfiles(); for (const p of profiles) { const target = doc(this.profiles(), p.id, 'bells', id); if ((await getDoc(target)).exists()) { await deleteDoc(target); return; } } }
  async getSounds() { const q = query(this.sounds(), orderBy('createdAt')); const rows = offline() ? await getDocsFromCache(q) : await getDocs(q); return rows.docs.map(x => soundFrom(x.id, x.data())); }
  async addSound(name: string, file: File) { const uid = userId(); const sound = doc(this.sounds()); const path = `users/${uid}/sounds/${sound.id}/${file.name}`; await uploadBytes(ref(storage!, path), file, { contentType: file.type || 'audio/mpeg' }); await setDoc(sound, { name, storagePath: path, mimeType: file.type || 'audio/mpeg', size: file.size, createdAt: serverTimestamp() }); await idb.putSoundBlob(sound.id, file); const d = await getDoc(sound); return soundFrom(sound.id, d.data()); }
  async updateSound(id: string, name: string) { await updateDoc(doc(this.sounds(), id), { name }); }
  async deleteSound(id: string) { const d = await getDoc(doc(this.sounds(), id)); if (d.exists()) { await deleteObject(ref(storage!, d.data().storagePath)); await deleteDoc(d.ref); } await idb.deleteSoundBlob(id); }
  async getSoundUrl(id: string) { const cached = await idb.getSoundBlob(id); if (cached) return URL.createObjectURL(cached); const d = await getDoc(doc(this.sounds(), id)); if (!d.exists()) return null; const url = await getDownloadURL(ref(storage!, d.data().storagePath)); try { const blob = await (await fetch(url)).blob(); await idb.putSoundBlob(id, blob); return URL.createObjectURL(blob); } catch { return url; } }
  async getSettings() { const uid = userId(); const target = doc(firestore!, 'users', uid, 'settings', 'app'); const d = offline() ? await getDocFromCache(target) : await getDoc(target); return d.exists() ? { ...DEFAULT_SETTINGS, ...d.data() } as AppSettings : DEFAULT_SETTINGS; }
  async updateSettings(patch: Partial<AppSettings>) { const uid = userId(); await setDoc(doc(firestore!, 'users', uid, 'settings', 'app'), { ...patch, updatedAt: serverTimestamp() }, { merge: true }); }
}
function pick(source: any, keys: string[]) { return Object.fromEntries(keys.filter(k => source[k] !== undefined).map(k => [k, source[k]])); }
export const cloudProvider = new CloudProvider();
