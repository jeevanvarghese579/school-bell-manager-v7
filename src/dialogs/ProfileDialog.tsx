import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  initialName?: string;
  title?: string;
}

export function ProfileDialog({ open, onClose, onSave, initialName, title = 'New Profile' }: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(initialName ?? '');
  }, [open, initialName]);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <label className="block text-xs font-medium text-[var(--c-textSecondary)] mb-1.5">Profile Name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="e.g. Normal Days"
        className="w-full px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]"
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={busy || !name.trim()}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
