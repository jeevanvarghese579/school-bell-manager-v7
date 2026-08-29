import type { BellProfile } from '@/models/types';
import { useProfiles } from '@/hooks/useProfiles';
import { Plus, Copy, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import { Toggle } from './ui/Toggle';
import { EmptyState } from './ui/EmptyState';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { ProfileDialog } from '@/dialogs/ProfileDialog';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  bellCounts: Record<string, number>;
  onChange: () => void;
  onProfileCreated: (profile: BellProfile) => void;
  dataVersion?: number;
}

export function ProfileList({ selectedId, onSelect, bellCounts, onChange, onProfileCreated, dataVersion }: Props) {
  const { profiles, loading, create, update, remove, duplicate } = useProfiles(onChange, dataVersion);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BellProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BellProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      // The menu is portalled to document.body, so both the portalled menu and
      // its trigger must be considered "inside". Previously a mousedown could
      // close the menu before React received the menu item's click.
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [menuOpen]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--c-textPrimary)]">Profiles</h2>
        <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="px-2 py-4 text-sm text-[var(--c-textSecondary)]">Loading...</div>
        ) : profiles.length === 0 ? (
          <EmptyState
            title="No bell profiles yet"
            message="Create a profile to start scheduling your school bells."
            action={
              <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Create Profile
              </Button>
            }
          />
        ) : (
          <div className="space-y-1">
            {profiles.map((p) => {
              const isSelected = selectedId === p.id;
              const isDisabled = !p.enabled;
              const count = bellCounts[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className={`group rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[var(--c-primary)] bg-[var(--c-surfaceSecondary)]'
                      : 'border-transparent hover:bg-[var(--c-surfaceSecondary)]'
                  }`}
                >
                  <div className="flex items-center gap-1 px-2 py-2">
                    {/* Profile info — flexible width, truncates */}
                    <button
                      onClick={() => onSelect(p.id)}
                      className={`flex-1 min-w-0 text-left py-1 ${isDisabled ? 'opacity-50' : ''}`}
                      title={p.name}
                    >
                      <div
                        className={`text-sm font-medium truncate ${
                          isDisabled
                            ? 'text-[var(--c-textSecondary)]'
                            : 'text-[var(--c-textPrimary)]'
                        }`}
                      >
                        {p.name}
                      </div>
                      <div className="text-xs text-[var(--c-textSecondary)] truncate">
                        {count} {count === 1 ? 'bell' : 'bells'}
                        {isDisabled && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--c-disabled)] text-[var(--c-textPrimary)]">
                            Disabled
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Action menu — fixed width */}
                    <div className="relative flex-shrink-0">
                      <button
                        ref={menuOpen === p.id ? menuButtonRef : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          onSelect(p.id);
                          setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setMenuOpen(menuOpen === p.id ? null : p.id);
                        }}
                        className="p-2 rounded-lg text-[var(--c-textSecondary)] hover:bg-[var(--c-border)] hover:text-[var(--c-textPrimary)] transition-colors"
                        aria-label="Profile actions"
                        title="Profile actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen === p.id && menuPosition && createPortal(
                        <div ref={menuRef} onPointerDown={(e) => e.stopPropagation()} style={{ top: menuPosition.top, right: menuPosition.right }} className="fixed w-44 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] shadow-xl z-[100] py-1">
                          <MenuItem icon={<Pencil size={14} />} label="Rename" onClick={() => { onSelect(p.id); setEditTarget(p); setMenuOpen(null); }} />
                          <MenuItem icon={<Copy size={14} />} label="Duplicate" onClick={async () => { onSelect(p.id); setMenuOpen(null); const copy = await duplicate(p.id); if (copy) onSelect(copy.id); }} />
                          <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { onSelect(p.id); setDeleteTarget(p); setMenuOpen(null); }} />
                        </div>, document.body)}
                    </div>

                    {/* Toggle — fixed width, gap */}
                    <div className="flex-shrink-0 pl-1">
                      <Toggle
                        checked={p.enabled}
                        onChange={(v) => { onSelect(p.id); update(p.id, { enabled: v }); }}
                        label={`Toggle ${p.name}`}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProfileDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={async (name) => {
          const created = await create(name);
          if (created) {
            // Select the ID returned by the provider immediately; do not wait
            // for the parent refresh (or a Firestore snapshot) to see it.
            onSelect(created.id);
            onProfileCreated(created);
            setCreateOpen(false);
          }
        }}
      />
      <ProfileDialog
        open={!!editTarget}
        initialName={editTarget?.name}
        title="Rename Profile"
        onClose={() => setEditTarget(null)}
        onSave={async (name) => { if (editTarget) await update(editTarget.id, { name }); setEditTarget(null); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message={`This will permanently delete its ${bellCounts[deleteTarget?.id ?? ''] ?? 0} bells.`}
        onConfirm={async () => { if (deleteTarget) await remove(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--c-surfaceSecondary)] transition-colors ${
        danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-textPrimary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
