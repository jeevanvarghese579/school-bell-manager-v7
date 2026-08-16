import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '@/models/types';
import { DEFAULT_SETTINGS } from '@/models/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useSettings() {
  const { provider } = useAuth();
  const { push } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSettings(await provider.getSettings());
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      setSettings((s) => (s ? { ...s, ...patch } : s));
      try {
        await provider.updateSettings(patch);
      } catch {
        push('Unable to save settings', 'error');
      }
    },
    [provider, push],
  );

  return { settings, update, refresh };
}
