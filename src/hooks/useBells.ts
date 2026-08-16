import { useCallback, useEffect, useState } from 'react';
import type { Bell } from '@/models/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useBells(profileId: string | null, onChange?: () => void) {
  const { provider } = useAuth();
  const { push } = useToast();
  const [bells, setBells] = useState<Bell[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profileId) {
      setBells([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setBells(await provider.getBells(profileId));
    } catch {
      push('Unable to load bells', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider, profileId, push]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (data: Partial<Bell>) => {
      if (!profileId) return;
      setLoading(true);
      try {
        const created = await provider.createBell(profileId, data);
        setBells((items) => [...items, created].sort((a, b) => a.time.localeCompare(b.time) || a.sortOrder - b.sortOrder));
        push('Alarm saved', 'success');
        onChange?.();
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Firestore] create bell failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to save alarm', 'error');
      } finally {
        setLoading(false);
      }
    },
    [provider, profileId, push, onChange],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Bell>) => {
      const previous = bells;
      setBells((items) => items.map((bell) => bell.id === id ? { ...bell, ...patch, updatedAt: Date.now() } : bell));
      setLoading(true);
      try {
        await provider.updateBell(id, patch);
        onChange?.();
      } catch (error) {
        setBells(previous);
        if (import.meta.env.DEV) console.error('[Firestore] update bell failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to update alarm', 'error');
      } finally {
        setLoading(false);
      }
    },
    [provider, bells, push, onChange],
  );

  const remove = useCallback(
    async (id: string) => {
      const previous = bells;
      setBells((items) => items.filter((bell) => bell.id !== id));
      setLoading(true);
      try {
        await provider.deleteBell(id);
        push('Alarm deleted', 'success');
        onChange?.();
      } catch (error) {
        setBells(previous);
        if (import.meta.env.DEV) console.error('[Firestore] delete bell failed', (error as { code?: string }).code, (error as Error).message);
        push('Unable to delete alarm', 'error');
      } finally {
        setLoading(false);
      }
    },
    [provider, bells, push, onChange],
  );

  return { bells, loading, refresh, create, update, remove };
}
