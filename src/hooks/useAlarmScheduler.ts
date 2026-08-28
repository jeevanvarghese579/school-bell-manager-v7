import { useEffect, useRef } from 'react';
import type { Bell, BellProfile, AppSettings, BellSound } from '@/models/types';
import { DEFAULT_BELL_SOUND_ID } from '@/models/types';
import { bellFiresOnDay, todayDateString } from '@/utils/time';
import { isElectron, getElectron } from '@/electron/electronBridge';

const DEBUG = import.meta.env.DEV;

function log(...args: unknown[]) {
  if (DEBUG) console.log('[Scheduler]', ...args);
}

interface SchedulerInput {
  profiles: BellProfile[];
  bells: Bell[];
  settings: AppSettings | null;
  sounds: BellSound[];
  getUrl: (id: string) => Promise<string | null>;
}

export function useAlarmScheduler({ profiles, bells, settings, sounds, getUrl }: SchedulerInput) {
  const firedRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep refs to latest data so the interval closure always sees fresh values
  const dataRef = useRef({ profiles, bells, settings, sounds, getUrl });
  dataRef.current = { profiles, bells, settings, sounds, getUrl };

  // Send schedule to Electron whenever data changes
  useEffect(() => {
    if (!isElectron() || !settings) return;
    const electron = getElectron();
    if (!electron) return;
    const enabledProfileIds = new Set(profiles.filter((p) => p.enabled).map((p) => p.id));
    const schedulableBells = bells
      .filter((b) => enabledProfileIds.has(b.profileId))
      .map((b) => ({
        id: b.id,
        name: b.name,
        time: b.time,
        repeatDays: b.repeatDays,
        enabled: b.enabled,
        profileEnabled: true,
        soundId: b.soundId,
      }));
    electron.scheduleBells(schedulableBells, settings);
    log('Sent schedule to Electron:', schedulableBells.length, 'bells, master:', settings.masterAlarmsEnabled);
  }, [profiles, bells, settings]);

  // Electron's main process owns the clock because renderer timers can be
  // throttled while the window is hidden. When it reports a due bell, resolve
  // and play that bell's configured sound in the renderer.
  useEffect(() => {
    if (!isElectron()) return;
    const electron = getElectron();
    if (!electron) return;

    return electron.onBellFired((bellId) => {
      const { bells, sounds, getUrl } = dataRef.current;
      const bell = bells.find((item) => item.id === bellId);
      if (!bell) {
        console.warn('[Scheduler] Electron fired an unknown bell:', bellId);
        return;
      }
      void fireBell(bell, sounds, getUrl, audioRef);
    });
  }, []);

  useEffect(() => {
    if (!settings) return;

    log('Scheduler started. Master:', settings.masterAlarmsEnabled);

    const tick = () => {
      const { profiles, bells, settings, sounds, getUrl } = dataRef.current;
      if (!settings || !settings.masterAlarmsEnabled) return;

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = todayDateString();
      const dayOfWeek = now.getDay();

      const enabledProfileIds = new Set(profiles.filter((p) => p.enabled).map((p) => p.id));

      for (const b of bells) {
        if (!b.enabled) continue;
        if (!enabledProfileIds.has(b.profileId)) continue;
        if (b.time !== hhmm) continue;
        if (!bellFiresOnDay(b.repeatDays, dayOfWeek)) continue;

        const key = `${b.id}|${today}|${hhmm}`;
        if (firedRef.current.has(key)) {
          log('Already fired:', key);
          continue;
        }
        firedRef.current.add(key);
        log('Alarm became due:', b.name, 'at', hhmm);

        void fireBell(b, sounds, getUrl, audioRef);
      }
    };

    // Electron uses its main-process scheduler. Browsers poll once per second;
    // per-bell fired keys prevent duplicates throughout the due minute.
    if (isElectron()) return;
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  // Cleanup old fired keys at midnight boundary
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm === '00:00') {
        firedRef.current.clear();
        log('Cleared fired keys at midnight');
      }
    };
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);
}

async function fireBell(
  bell: Bell,
  sounds: BellSound[],
  getUrl: (id: string) => Promise<string | null>,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
) {
  const soundId = bell.soundId ?? DEFAULT_BELL_SOUND_ID;
  log('Resolved sound ID:', soundId);

  const url = await getUrl(soundId);
  if (!url) {
    console.warn('[Scheduler] No sound URL for bell', bell.id, 'sound', soundId, '— falling back to default');
    const fallbackUrl = await getUrl(DEFAULT_BELL_SOUND_ID);
    if (!fallbackUrl) {
      console.error('[Scheduler] Default bell sound also unavailable');
      return;
    }
    return play(fallbackUrl, bell, audioRef);
  }

  log('Resolved sound source:', url.substring(0, 60));
  return play(url, bell, audioRef);
}

async function play(
  url: string,
  bell: Bell,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
) {
  try {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.volume = 1;
    log('Playback started for:', bell.name);
    await audioRef.current.play();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('School Bell', { body: bell.name });
    }
    log('Playback completed for:', bell.name);
  } catch (e) {
    console.warn('[Scheduler] Playback failed:', e);
  }
}
