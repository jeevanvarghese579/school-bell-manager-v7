import { useRef, useState, useEffect } from 'react';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSounds } from '@/hooks/useSounds';
import { useToast } from '@/hooks/useToast';
import { Upload, Play, Trash2, Pencil, Check, Bell } from 'lucide-react';
import type { BellSound } from '@/models/types';

const ACCEPTED = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/vorbis'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SoundDialog({ open, onClose }: Props) {
  const { sounds, add, remove, rename, getUrl } = useSounds();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingName, setPendingName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { playingId: previewing, toggle: preview, stop } = useAudioPreview();
  const [deleteTarget, setDeleteTarget] = useState<BellSound | null>(null);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      push('File too large (max 10MB)', 'error');
      return;
    }
    const ok = ACCEPTED.includes(f.type) || /\.(mp3|wav|ogg)$/i.test(f.name);
    if (!ok) {
      push('Unsupported audio format. Use MP3, WAV, or OGG.', 'error');
      return;
    }
    setPendingFile(f);
    setPendingName(f.name.replace(/\.[^.]+$/, ''));
  };

  const upload = async () => {
    if (!pendingFile || !pendingName.trim()) return;
    try {
      await add(pendingName.trim(), pendingFile);
      setPendingFile(null);
      setPendingName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      /* toast already shown */
    }
  };

  useEffect(() => { if (!open) stop(); }, [open, stop]);

  const saveRename = async (id: string) => {
    if (editName.trim()) {
      await rename(id, editName.trim());
    }
    setEditing(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Bell Sounds" maxWidth="max-w-lg">
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {sounds.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)]">
            <button onClick={() => preview(s.id, getUrl).catch(() => push('Unable to play this sound', 'error'))} className="p-2 rounded-lg hover:bg-[var(--c-border)] transition-colors flex-shrink-0" aria-label={`Preview ${s.name}`} title={previewing === s.id ? 'Stop preview' : 'Preview'}>
              <Play size={14} className={previewing === s.id ? 'text-[var(--c-primary)] animate-pulse' : 'text-[var(--c-textPrimary)]'} />
            </button>
            {editing === s.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRename(s.id); }}
                className="flex-1 min-w-0 px-2 py-1 rounded bg-[var(--c-surface)] border border-[var(--c-primary)] text-sm text-[var(--c-textPrimary)]"
                autoFocus
              />
            ) : (
              <span className="flex-1 min-w-0 text-sm text-[var(--c-textPrimary)] truncate">{s.name}</span>
            )}
            {s.size > 0 && <span className="text-xs text-[var(--c-textSecondary)] flex-shrink-0">{(s.size / 1024).toFixed(0)} KB</span>}
            {editing === s.id ? (
              <button onClick={() => saveRename(s.id)} className="p-2 rounded-lg hover:bg-[var(--c-border)] text-[var(--c-success)] flex-shrink-0" aria-label="Save name" title="Save name">
                <Check size={14} />
              </button>
            ) : (
              <button onClick={() => { setEditing(s.id); setEditName(s.name); }} className="p-2 rounded-lg hover:bg-[var(--c-border)] text-[var(--c-textSecondary)] flex-shrink-0" aria-label="Rename" title="Rename">
                <Pencil size={14} />
              </button>
            )}
            {s.id !== '__default_bell__' && (
              <button onClick={() => setDeleteTarget(s)} className="p-2 rounded-lg hover:bg-[var(--c-danger)]/10 text-[var(--c-textSecondary)] hover:text-[var(--c-danger)] flex-shrink-0" aria-label="Delete sound" title="Delete sound">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--c-border)] space-y-3">
        <Button variant="primary" onClick={() => preview('__default_bell__', getUrl).catch(() => push('Unable to play this sound', 'error'))} className="w-full">
          <Bell size={16} /> Test Bell
        </Button>

        {pendingFile ? (
          <div className="space-y-2">
            <input
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="Sound name"
              className="w-full px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]"
            />
            <div className="flex gap-2">
              <Button onClick={() => { setPendingFile(null); setPendingName(''); }}>Cancel</Button>
              <Button variant="primary" onClick={upload}>Upload</Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">
            <Upload size={15} /> Upload Sound
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[var(--c-textPrimary)] mb-2">Delete "{deleteTarget.name}"?</h3>
            <p className="text-sm text-[var(--c-textSecondary)] mb-4">
              Alarms using this sound will fall back to Default Bell. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={async () => {
                try { await remove(deleteTarget.id); setDeleteTarget(null); }
                catch { /* toast already shown */ }
              }}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
