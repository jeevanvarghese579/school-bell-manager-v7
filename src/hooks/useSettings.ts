import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '@/models/types';
import { DEFAULT_SETTINGS } from '@/models/types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { getElectron } from '@/electron/electronBridge';

export function useSettings() {
  const { provider } = useAuth();
  const { push } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const launchOnStartup = settings?.launchOnStartup;

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

  useEffect(() => {
    if (launchOnStartup === undefined) return;
    const electron = getElectron();
    if (!electron) return;

    // Reconcile the Windows startup entry on every application launch. This
    // also repairs an entry if a portable executable was moved or replaced.
    electron.setAutoLaunch(launchOnStartup).catch(() => {
      push('Unable to update Windows startup setting', 'error');
    });
  }, [launchOnStartup, push]);

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
