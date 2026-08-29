import type { Bell } from '@/models/types';
import { useBells } from '@/hooks/useBells';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/Button';
import { Toggle } from './ui/Toggle';
import { EmptyState } from './ui/EmptyState';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { BellDialog } from '@/dialogs/BellDialog';
import { to12h, formatRepeat } from '@/utils/time';

interface Props {
  profileId: string | null;
  profileName: string | null;
  profileEnabled: boolean;
  onChange: () => void;
}

export function BellList({ profileId, profileName, profileEnabled, onChange }: Props) {
  const { bells, loading, create, update, remove } = useBells(profileId, onChange);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bell | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bell | null>(null);

  if (!profileId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--c-textSecondary)]">
        Select a profile to view its bells
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--c-textPrimary)] truncate">{profileName ?? 'Profile'}</h2>
          <p className="text-xs text-[var(--c-textSecondary)]">{bells.length} {bells.length === 1 ? 'bell' : 'bells'}</p>
        </div>
        <Button size="sm" variant="primary" disabled={!profileEnabled} onClick={() => setAddOpen(true)} className="flex-shrink-0">
          <Plus size={15} /> Add Bell
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="text-sm text-[var(--c-textSecondary)] px-2 py-4">Loading...</div>
        ) : bells.length === 0 ? (
          <EmptyState
            title="No bells in this profile"
            message="Add a bell to schedule an alarm for this profile."
            action={
              <Button size="sm" variant="primary" disabled={!profileEnabled} onClick={() => setAddOpen(true)}>
                <Plus size={15} /> Add Bell
              </Button>
            }
          />
        ) : (
          <div className="space-y-1.5">
            {bells.map((b) => {
              const isDisabled = !b.enabled;
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-[var(--c-surface)] border transition-all ${
                    isDisabled
                      ? 'border-[var(--c-border)] opacity-50'
                      : 'border-[var(--c-border)] hover:border-[var(--c-primary)]'
                  }`}
                >
                  <div
                    className={`w-20 text-sm font-semibold tabular-nums flex-shrink-0 ${
                      isDisabled ? 'text-[var(--c-textSecondary)]' : 'text-[var(--c-textPrimary)]'
                    }`}
                  >
                    {to12h(b.time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        isDisabled ? 'text-[var(--c-textSecondary)]' : 'text-[var(--c-textPrimary)]'
                      }`}
                    >
                      {b.name}
                    </div>
                    <div className="text-xs text-[var(--c-textSecondary)] truncate">
                      {formatRepeat(b.repeatDays)}
                      {isDisabled && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--c-disabled)] text-[var(--c-textPrimary)]">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Toggle
                      checked={b.enabled}
                      onChange={(v) => profileEnabled && update(b.id, { enabled: v })}
                      label={`Toggle ${b.name}`}
                      size="sm"
                    />
                    <button
                      disabled={!profileEnabled} onClick={() => setEditTarget(b)}
                      className="p-2 rounded-lg text-[var(--c-textSecondary)] hover:bg-[var(--c-surfaceSecondary)] hover:text-[var(--c-textPrimary)] transition-colors"
                      aria-label="Edit bell"
                      title="Edit bell"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      disabled={!profileEnabled} onClick={() => setDeleteTarget(b)}
                      className="p-2 rounded-lg text-[var(--c-textSecondary)] hover:bg-[var(--c-danger)]/10 hover:text-[var(--c-danger)] transition-colors"
                      aria-label="Delete bell"
                      title="Delete bell"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BellDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (data) => { await create(data); setAddOpen(false); }}
      />
      <BellDialog
        open={!!editTarget}
        initial={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={async (data) => { if (editTarget) await update(editTarget.id, data); setEditTarget(null); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message="This alarm will be permanently removed."
        onConfirm={async () => { if (deleteTarget) await remove(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
      {!profileEnabled && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--c-background)]/85 backdrop-blur-[1px] p-6"><div className="max-w-sm text-center"><h2 className="text-xl font-bold">Profile Is Turned Off</h2><p className="mt-2 text-sm text-[var(--c-textSecondary)]">Turn on this profile to view or edit its bells. Bells in this profile will not ring while it is turned off.</p><Button variant="primary" className="mt-5 px-6 py-3" onClick={() => window.dispatchEvent(new CustomEvent('sbm-enable-profile', { detail: profileId }))}>Turn On Profile</Button></div></div>}
    </div>
  );
}
