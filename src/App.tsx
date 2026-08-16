import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bell, BellProfile } from '@/models/types';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider, useToast } from '@/hooks/useToast';
import { SoundsProvider, useSounds } from '@/hooks/useSounds';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';
import { useAlarmScheduler } from '@/hooks/useAlarmScheduler';
import { Header } from '@/components/Header';
import { ProfileList } from '@/components/ProfileList';
import { BellList } from '@/components/BellList';
import { ResizablePanels } from '@/components/ResizablePanels';
import { AuthDialog } from '@/dialogs/AuthDialog';
import { SettingsDialog } from '@/dialogs/SettingsDialog';
import { SoundDialog } from '@/dialogs/SoundDialog';
import { MigrationDialog } from '@/dialogs/MigrationDialog';
import { ToastHost } from '@/components/ui/ToastHost';
import { isElectron } from '@/electron/electronBridge';
import { idb } from '@/storage/indexeddb';
import { getNextBell, to12h } from '@/utils/time';
import { Menu, Bell as BellIcon, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function Shell() {
  const { state, provider } = useAuth();
  const { push } = useToast();
  const { settings, update } = useSettings();
  useTheme(settings);

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundsOpen, setSoundsOpen] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [dataVersion, setDataVersion] = useState(0);
  const bumpData = useCallback(() => setDataVersion((v) => v + 1), []);

  const soundsHook = useSounds();

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status === 'offline' && !sessionStorage.getItem('sbm_auth_seen')) {
      setAuthOpen(true);
      sessionStorage.setItem('sbm_auth_seen', '1');
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'cloud') return;
    let cancelled = false;
    (async () => {
      try {
        const has = await idb.hasLocalData();
        if (!cancelled && has) setMigrationOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [state.status]);

  const [profiles, setProfiles] = useState<BellProfile[]>([]);
  const [bellsByProfile, setBellsByProfile] = useState<Record<string, Bell[]>>({});

  const handleProfileCreated = useCallback((profile: BellProfile) => {
    // Keep the shell's list in sync before its asynchronous refresh returns.
    // Otherwise its selection guard can mistake the new ID for a deleted profile
    // and switch back to the previously selected profile.
    setProfiles((items) => [...items.filter((item) => item.id !== profile.id), profile]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt));
    setBellsByProfile((items) => ({ ...items, [profile.id]: items[profile.id] ?? [] }));
    setSelectedProfileId(profile.id);
  }, []);

  useEffect(() => {
    if (state.status === 'loading' || !settings) return;
    let cancelled = false;
    (async () => {
      try {
        const allProfiles = await provider.getProfiles();
        if (cancelled) return;
        setProfiles(allProfiles);
        const map: Record<string, Bell[]> = {};
        for (const p of allProfiles) {
          map[p.id] = await provider.getBells(p.id);
        }
        if (!cancelled) setBellsByProfile(map);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [provider, state.status, settings, dataVersion]);

  const bellCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      counts[p.id] = (bellsByProfile[p.id] ?? []).length;
    }
    return counts;
  }, [profiles, bellsByProfile]);

  const selectedProfileName = useMemo(() => {
    if (!selectedProfileId) return null;
    return profiles.find((p) => p.id === selectedProfileId)?.name ?? null;
  }, [selectedProfileId, profiles]);
  const selectedProfileEnabled = profiles.find((p) => p.id === selectedProfileId)?.enabled ?? true;
  useEffect(() => {
    const enable = async (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setSelectedProfileId(id);
      const previous = profiles;
      setProfiles((items) => items.map((profile) => profile.id === id ? { ...profile, enabled: true, updatedAt: Date.now() } : profile));
      try { await provider.updateProfile(id, { enabled: true }); bumpData(); }
      catch { setProfiles(previous); }
    };
    window.addEventListener('sbm-enable-profile', enable);
    return () => window.removeEventListener('sbm-enable-profile', enable);
  }, [provider, bumpData]);

  const flatBells = useMemo(
    () => profiles.filter((p) => p.enabled).flatMap((p) => bellsByProfile[p.id] ?? []),
    [profiles, bellsByProfile],
  );

  useAlarmScheduler({
    profiles,
    bells: flatBells,
    settings,
    sounds: soundsHook.sounds,
    getUrl: soundsHook.getUrl,
  });

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }
    if (selectedProfileId && !profiles.find((p) => p.id === selectedProfileId)) {
      setSelectedProfileId(profiles[0]?.id ?? null);
    }
  }, [profiles, selectedProfileId]);

  // Diagnostic logging in dev mode
  useEffect(() => {
    if (!import.meta.env.DEV || !settings) return;
    const next = getNextBell(
      flatBells.map((b) => ({
        id: b.id, name: b.name, time: b.time, repeatDays: b.repeatDays,
        enabled: b.enabled, profileEnabled: true, soundId: b.soundId,
      })),
      settings.masterAlarmsEnabled,
    );
    console.log('[Diagnostics]', {
      master: settings.masterAlarmsEnabled,
      activeProfiles: profiles.filter((p) => p.enabled).length,
      activeBells: flatBells.filter((b) => b.enabled).length,
      nextBell: next ? `${next.bell.name} — ${to12h(next.bell.time)}` : 'None',
      sound: next ? soundsHook.soundName(next.bell.soundId) : 'N/A',
    });
  }, [settings, flatBells, profiles, soundsHook]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--c-primary)] flex items-center justify-center animate-pulse">
            <BellIcon size={22} className="text-white" />
          </div>
          <p className="text-sm text-[var(--c-textSecondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  const masterOff = settings && !settings.masterAlarmsEnabled;

  return (
    <div className="h-screen flex flex-col bg-[var(--c-background)] text-[var(--c-textPrimary)]">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      {!isElectron() && state.status === 'cloud' && (
        <div className="px-4 py-1.5 bg-[var(--c-surfaceSecondary)] border-b border-[var(--c-border)] text-xs text-[var(--c-textSecondary)] text-center">
          For reliable background bell playback, use the Windows desktop application.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop: resizable panels */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <ResizablePanels
            left={
              <ProfileList
                selectedId={selectedProfileId}
                onSelect={setSelectedProfileId}
                bellCounts={bellCounts}
                onChange={bumpData}
                onProfileCreated={handleProfileCreated}
                dataVersion={dataVersion}
              />
            }
            right={
              <BellList
                profileId={selectedProfileId}
                profileName={selectedProfileName}
                profileEnabled={selectedProfileEnabled}
                onChange={bumpData}
              />
            }
          />
        </div>

        {/* Mobile: drawer + full-width bells */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          {drawerOpen && (
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)}>
              <aside
                className="w-72 h-full bg-[var(--c-surface)] border-r border-[var(--c-border)]"
                onClick={(e) => e.stopPropagation()}
              >
                <ProfileList
                  selectedId={selectedProfileId}
                  onSelect={(id) => { setSelectedProfileId(id); setDrawerOpen(false); }}
                  bellCounts={bellCounts}
                  onChange={bumpData}
                  onProfileCreated={handleProfileCreated}
                  dataVersion={dataVersion}
                />
              </aside>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--c-border)] bg-[var(--c-surface)]">
            <Button size="icon" variant="ghost" onClick={() => setDrawerOpen(true)} aria-label="Open profiles">
              <Menu size={18} />
            </Button>
            <span className="text-sm font-medium text-[var(--c-textPrimary)]">Profiles</span>
          </div>
          <BellList
            profileId={selectedProfileId}
            profileName={selectedProfileName}
            profileEnabled={selectedProfileEnabled}
            onChange={bumpData}
          />
        </div>

        {/* Master Alarm OFF overlay */}
        {masterOff && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-auto">
            <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[var(--c-danger)]/20 flex items-center justify-center">
                <BellOff size={32} className="text-[var(--c-danger)]" />
              </div>
              <h2 className="text-xl font-bold text-white">Master Alarms Are Off</h2>
              <p className="text-sm text-white/80">
                Scheduled bells will not ring until Master Alarms are turned on.
              </p>
              <Button
                variant="primary"
                size="md"
                className="px-6 py-3 text-base"
                onClick={() => update({ masterAlarmsEnabled: true })}
              >
                Turn On Master Alarms
              </Button>
            </div>
          </div>
        )}
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={update}
        onOpenSounds={() => { setSettingsOpen(false); setSoundsOpen(true); }}
        onOpenAuth={() => { setSettingsOpen(false); setAuthOpen(true); }}
      />
      <SoundDialog open={soundsOpen} onClose={() => setSoundsOpen(false)} />
      <MigrationDialog
        open={migrationOpen}
        onClose={() => setMigrationOpen(false)}
        onDone={() => { push('Migration complete', 'success'); bumpData(); }}
      />
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SoundsProvider>
          <Shell />
        </SoundsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
