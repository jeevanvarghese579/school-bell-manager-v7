import { useCallback, useEffect, useRef, useState } from 'react';
import type { BellProfile } from '@/models/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useProfiles(onChange?: () => void, refreshKey?: number) {
  const { provider } = useAuth();
  const { push } = useToast();
  const [profiles, setProfiles] = useState<BellProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    // Only replace the list with the loading placeholder on the initial load.
    // Later reconciliations should keep the current profiles visible.
    if (!hasLoaded.current) setLoading(true);
    try {
      setProfiles(await provider.getProfiles());
    } catch {
      push('Unable to load profiles', 'error');
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, [provider, push]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const create = useCallback(
    async (name: string) => {
      try {
        const created = await provider.createProfile(name);
        setProfiles((items) => [...items, created].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt));
        push('Profile created', 'success');
        onChange?.();
        return created;
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Firestore] create profile failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to create profile', 'error');
        return null;
      }
    },
    [provider, push, onChange],
  );

  const update = useCallback(
    async (id: string, patch: Partial<BellProfile>) => {
      const previous = profiles;
      setProfiles((items) => items.map((profile) => profile.id === id ? { ...profile, ...patch, updatedAt: Date.now() } : profile));
      try {
        await provider.updateProfile(id, patch);
        onChange?.();
      } catch (error) {
        setProfiles(previous);
        if (import.meta.env.DEV) console.error('[Firestore] update profile failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to update profile', 'error');
      }
    },
    [provider, profiles, push, onChange],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await provider.deleteProfile(id);
        setProfiles((items) => items.filter((profile) => profile.id !== id));
        push('Profile deleted', 'success');
        onChange?.();
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Firestore] delete profile failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to delete profile', 'error');
      }
    },
    [provider, push, onChange],
  );

  const duplicate = useCallback(
    async (id: string) => {
      try {
        const copy = await provider.duplicateProfile(id);
        if (copy) setProfiles((items) => [...items, copy].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt));
        push('Profile duplicated', 'success');
        onChange?.();
        return copy;
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Firestore] duplicate profile failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to duplicate profile', 'error');
        return null;
      }
    },
    [provider, push, onChange],
  );

  return { profiles, loading, refresh, create, update, remove, duplicate };
}
