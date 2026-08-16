import { useClock } from '@/hooks/useClock';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Cloud, CloudOff, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { isElectron } from '@/electron/electronBridge';

interface Props {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: Props) {
  const clock = useClock();
  const { mode } = useAuth();
  const electron = isElectron();

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--c-border)] bg-[var(--c-surface)]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--c-primary)] flex items-center justify-center">
          <Bell size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--c-textPrimary)] leading-tight">School Bell Manager</h1>
          <div className="flex items-center gap-1.5 text-xs text-[var(--c-textSecondary)]">
            {mode === 'cloud' ? (
              <>
                <Cloud size={12} />
                <span>Cloud · Synced</span>
              </>
            ) : (
              <>
                <CloudOff size={12} />
                <span>Offline Mode</span>
              </>
            )}
            {electron && <span className="opacity-60">· Desktop</span>}
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="text-xl font-semibold text-[var(--c-textPrimary)] tabular-nums">{clock.time}</div>
        <div className="text-xs text-[var(--c-textSecondary)]">{clock.date}</div>
      </div>

      <Button size="icon" variant="ghost" onClick={onOpenSettings} aria-label="Settings">
        <Settings size={18} />
      </Button>
    </header>
  );
}
