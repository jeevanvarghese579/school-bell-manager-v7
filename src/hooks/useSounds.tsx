import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BellSound } from '@/models/types';
import { DEFAULT_BELL_SOUND_ID, DEFAULT_BELL_SOUND_NAME } from '@/models/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const DEFAULT_SOUND: BellSound = {
  id: DEFAULT_BELL_SOUND_ID,
  name: DEFAULT_BELL_SOUND_NAME,
  storagePath: '__default__',
  mimeType: 'audio/wav',
  size: 0,
  createdAt: 0,
};

interface SoundsContextValue {
  sounds: BellSound[];
  loading: boolean;
  refresh: () => Promise<void>;
  add: (name: string, file: File) => Promise<void>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  getUrl: (id: string) => Promise<string | null>;
  soundName: (id: string | null | undefined) => string;
  soundExists: (id: string | null | undefined) => boolean;
}

const SoundsContext = createContext<SoundsContextValue | null>(null);

export function SoundsProvider({ children }: { children: ReactNode }) {
  const { provider } = useAuth();
  const { push } = useToast();
  const [sounds, setSounds] = useState<BellSound[]>([DEFAULT_SOUND]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await provider.getSounds();
      setSounds([DEFAULT_SOUND, ...list]);
    } catch {
      push('Unable to load sounds', 'error');
    } finally {
      setLoading(false);
    }
  }, [provider, push]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (name: string, file: File) => {
      try {
        await provider.addSound(name, file);
        await refresh();
        push('Sound uploaded', 'success');
      } catch (e) {
        push('Unable to upload sound', 'error');
        throw e;
      }
    },
    [provider, refresh, push],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await provider.deleteSound(id);
        await refresh();
        push('Sound deleted', 'success');
      } catch {
        push('Unable to delete sound', 'error');
        throw new Error('delete failed');
      }
    },
    [provider, refresh, push],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      try {
        await provider.updateSound(id, name);
        await refresh();
      } catch {
        push('Unable to rename sound', 'error');
      }
    },
    [provider, refresh, push],
  );

  const getUrl = useCallback(
    async (id: string): Promise<string | null> => {
      // Keep this relative to dist/index.html so it works for both Vite's web
      // server and Electron's file:// packaged renderer.
      if (id === DEFAULT_BELL_SOUND_ID) return './sounds/default-bell.wav';
      try {
        return await provider.getSoundUrl(id);
      } catch {
        return null;
      }
    },
    [provider],
  );

  const soundName = useCallback(
    (id: string | null | undefined): string => {
      if (!id || id === DEFAULT_BELL_SOUND_ID) return DEFAULT_BELL_SOUND_NAME;
      return sounds.find((s) => s.id === id)?.name ?? DEFAULT_BELL_SOUND_NAME;
    },
    [sounds],
  );

  const soundExists = useCallback(
    (id: string | null | undefined): boolean => {
      if (!id || id === DEFAULT_BELL_SOUND_ID) return true;
      return sounds.some((s) => s.id === id);
    },
    [sounds],
  );

  return (
    <SoundsContext.Provider value={{ sounds, loading, refresh, add, remove, rename, getUrl, soundName, soundExists }}>
      {children}
    </SoundsContext.Provider>
  );
}

export function useSounds(): SoundsContextValue {
  const ctx = useContext(SoundsContext);
  if (!ctx) throw new Error('useSounds must be used within SoundsProvider');
  return ctx;
}
