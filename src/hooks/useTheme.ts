import { useEffect, useState } from 'react';
import { applyTheme, type ThemeName } from '@/themes/tokens';
import type { AppSettings } from '@/models/types';

function resolve(theme: AppSettings['theme']): ThemeName {
  if (theme === 'light' || theme === 'dark') return theme;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function useTheme(settings: AppSettings | null) {
  const [resolved, setResolved] = useState<ThemeName>('dark');

  useEffect(() => {
    if (!settings) return;
    const t = resolve(settings.theme);
    setResolved(t);
    applyTheme(t);
  }, [settings?.theme]);

  useEffect(() => {
    if (!settings || settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const t = resolve('system');
      setResolved(t);
      applyTheme(t);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings?.theme]);

  return resolved;
}
