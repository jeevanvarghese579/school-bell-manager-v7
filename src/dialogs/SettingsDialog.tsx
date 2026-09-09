import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getElectron, isElectron } from '@/electron/electronBridge';
import type { AppSettings } from '@/models/types';
import { Sun, Moon, Monitor, Bell, Music, User, Info, Power, CloudOff } from 'lucide-react';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onOpenSounds: () => void;
  onOpenAuth: () => void;
}

export function SettingsDialog({ open, onClose, settings, onUpdateSettings, onOpenSounds, onOpenAuth }: Props) {
  const { state, mode, signOut, cloudConfigured } = useAuth();
  const { push } = useToast();
  const electron = isElectron();
  const [signingOut, setSigningOut] = useState(false);

  if (!settings) return null;

  const setTheme = (theme: AppSettings['theme']) => onUpdateSettings({ theme });

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    push('Signed out', 'info');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" maxWidth="max-w-lg">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto">
        {/* General */}
        <Section icon={<Monitor size={15} />} title="General">
          <div>
            <label className="block text-xs font-medium text-[var(--c-textSecondary)] mb-2">Theme</label>
            <div className="flex gap-2">
              <ThemeButton active={settings.theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={14} />} label="Light" />
              <ThemeButton active={settings.theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={14} />} label="Dark" />
              <ThemeButton active={settings.theme === 'system'} onClick={() => setTheme('system')} icon={<Monitor size={14} />} label="System" />
            </div>
          </div>
        </Section>

        {/* Bells */}
        <Section icon={<Bell size={15} />} title="Bells">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--c-textPrimary)]">Master Alarm Switch</div>
              <div className="text-xs text-[var(--c-textSecondary)]">Disables all bell execution without changing individual alarms.</div>
            </div>
            <Toggle checked={settings.masterAlarmsEnabled} onChange={(v) => onUpdateSettings({ masterAlarmsEnabled: v })} label="Master alarm switch" />
          </div>
        </Section>

        {/* Sounds */}
        <Section icon={<Music size={15} />} title="Sounds">
          <Button variant="secondary" onClick={onOpenSounds} className="w-full justify-start">
            <Music size={15} /> Manage custom sounds
          </Button>
        </Section>

        {/* Account */}
        <Section icon={<User size={15} />} title="Account">
          {mode === 'cloud' && state.status === 'cloud' ? (
            <div className="space-y-2">
              <div className="text-sm text-[var(--c-textPrimary)]">{state.email}</div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--c-success)]">
                <span className="w-2 h-2 rounded-full bg-[var(--c-success)]" /> Synced
              </div>
              <Button variant="danger" onClick={doSignOut} disabled={signingOut} className="w-full">
                <Power size={15} /> Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-[var(--c-textSecondary)]">
                <CloudOff size={14} /> Offline Mode
              </div>
              <Button variant="primary" onClick={onOpenAuth} className="w-full">
                Sign In / Switch to Cloud
              </Button>
              {!cloudConfigured && (
                <p className="text-xs text-[var(--c-textSecondary)]">Cloud sync is not configured for this build.</p>
              )}
            </div>
          )}
        </Section>

        {/* Windows Desktop */}
        {electron && (
          <Section icon={<Power size={15} />} title="Windows Desktop">
            <ToggleRow
              label="Launch on Windows startup"
              checked={settings.launchOnStartup}
              onChange={(v) => onUpdateSettings({ launchOnStartup: v })}
            />
            <ToggleRow
              label="Minimize to tray"
              checked={settings.minimizeToTray}
              onChange={(v) => onUpdateSettings({ minimizeToTray: v })}
            />
            <ToggleRow
              label="Start minimized"
              checked={settings.startMinimized}
              onChange={(v) => onUpdateSettings({ startMinimized: v })}
            />
          </Section>
        )}

        {/* About */}
        <Section icon={<Info size={15} />} title="About">
          <div className="text-sm text-[var(--c-textPrimary)]">School Bell Manager</div>
          <div className="text-xs text-[var(--c-textSecondary)]">Version 7.0.2</div>
          <div className="text-xs text-[var(--c-textSecondary)] mt-1">Developed by: Jeevan Varghese</div>
          <div className="text-xs text-[var(--c-textSecondary)]">Visit <a href="https://itsjeevanvarghese.web.app" target="_blank" rel="noopener noreferrer" onClick={(e) => { if (isElectron()) { e.preventDefault(); getElectron()?.openExternal('https://itsjeevanvarghese.web.app'); } }} className="text-[var(--c-primary)] underline hover:opacity-80">itsjeevanvarghese.web.app</a> for more softwares</div>
        </Section>
      </div>
    </Modal>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[var(--c-primary)]">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--c-textSecondary)]">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'bg-[var(--c-primary)] text-white'
          : 'bg-[var(--c-surfaceSecondary)] text-[var(--c-textSecondary)] border border-[var(--c-border)] hover:border-[var(--c-primary)]'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[var(--c-textPrimary)]">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
