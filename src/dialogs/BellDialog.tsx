import { useEffect, useState } from 'react';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Play, AlertTriangle } from 'lucide-react';
import type { Bell } from '@/models/types';
import { DAYS, to12h } from '@/utils/time';
import { useSounds } from '@/hooks/useSounds';
import { DEFAULT_BELL_SOUND_ID } from '@/models/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Bell>) => Promise<void>;
  initial?: Bell | null;
}

export function BellDialog({ open, onClose, onSave, initial }: Props) {
  const { sounds, getUrl, soundExists } = useSounds();
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [repeat, setRepeat] = useState<number[]>([]);
  const [soundId, setSoundId] = useState<string>(DEFAULT_BELL_SOUND_ID);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const { playingId: previewing, toggle: preview, stop } = useAudioPreview();
  const [missingSound, setMissingSound] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setTime(initial?.time ?? '08:00');
      setRepeat(initial?.repeatDays ?? []);
      setEnabled(initial?.enabled ?? true);

      const savedSoundId = initial?.soundId ?? DEFAULT_BELL_SOUND_ID;
      if (savedSoundId !== DEFAULT_BELL_SOUND_ID && !soundExists(savedSoundId)) {
        setSoundId(DEFAULT_BELL_SOUND_ID);
        setMissingSound(true);
      } else {
        setSoundId(savedSoundId);
        setMissingSound(false);
      }
    }
  }, [open, initial, soundExists]);
  useEffect(() => { if (!open) stop(); }, [open, stop]);

  const toggleDay = (d: number) => {
    setRepeat((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d].sort()));
  };

  const setPreset = (preset: 'daily' | 'weekdays' | 'everyday') => {
    if (preset === 'daily') setRepeat([]);
    if (preset === 'weekdays') setRepeat([1, 2, 3, 4, 5]);
    if (preset === 'everyday') setRepeat([0, 1, 2, 3, 4, 5, 6]);
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ name: name.trim() || 'Bell', time, repeatDays: repeat, soundId, enabled });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Bell' : 'Add Bell'} maxWidth="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--c-textSecondary)] mb-1.5">Alarm Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Prayer"
            className="w-full px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--c-textSecondary)] mb-1.5">
            Time <span className="text-[var(--c-primary)]">({to12h(time)})</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--c-textSecondary)] mb-1.5">Repeat</label>
          <div className="flex gap-1.5 mb-2">
            <Button size="sm" variant={repeat.length === 0 ? 'primary' : 'secondary'} onClick={() => setPreset('daily')}>Daily</Button>
            <Button size="sm" variant={repeat.join(',') === '1,2,3,4,5' ? 'primary' : 'secondary'} onClick={() => setPreset('weekdays')}>Weekdays</Button>
            <Button size="sm" variant={repeat.length === 7 ? 'primary' : 'secondary'} onClick={() => setPreset('everyday')}>Every day</Button>
          </div>
          <div className="flex gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                  repeat.includes(i)
                    ? 'bg-[var(--c-primary)] text-white'
                    : 'bg-[var(--c-surfaceSecondary)] text-[var(--c-textSecondary)] border border-[var(--c-border)] hover:border-[var(--c-primary)]'
                }`}
                aria-label={`Toggle ${d}`}
                aria-pressed={repeat.includes(i)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--c-textSecondary)] mb-1.5">Alarm Sound</label>
          {missingSound && (
            <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--c-warning)]/10 border border-[var(--c-warning)]/30 text-xs text-[var(--c-textPrimary)]">
              <AlertTriangle size={14} className="text-[var(--c-warning)] flex-shrink-0 mt-0.5" />
              <span>The sound previously used for this bell no longer exists. It has been reset to Default Bell.</span>
            </div>
          )}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {sounds.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  soundId === s.id
                    ? 'border-[var(--c-primary)] bg-[var(--c-surfaceSecondary)]'
                    : 'border-[var(--c-border)] hover:bg-[var(--c-surfaceSecondary)]'
                }`}
                onClick={() => setSoundId(s.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); preview(s.id, getUrl); }}
                  className="p-2 rounded-lg bg-[var(--c-surfaceSecondary)] hover:bg-[var(--c-border)] transition-colors flex-shrink-0"
                  aria-label={`Preview ${s.name}`}
                  title={previewing === s.id ? 'Stop preview' : 'Preview'}
                >
                  <Play size={14} className={previewing === s.id ? 'text-[var(--c-primary)] animate-pulse' : 'text-[var(--c-textPrimary)]'} />
                </button>
                <span className="text-sm text-[var(--c-textPrimary)] flex-1 truncate">{s.name}</span>
                {soundId === s.id && (
                  <span className="text-xs text-[var(--c-primary)] font-medium flex-shrink-0">Selected</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--c-textPrimary)]">Enabled</label>
          <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          Save Alarm
        </Button>
      </div>
    </Modal>
  );
}
