import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { idb } from '@/storage/indexeddb';
import { offlineProvider } from '@/services/OfflineProvider';
import { cloudProvider } from '@/services/CloudProvider';
import { useState } from 'react';
import type { BellProfile, Bell, BellSound } from '@/models/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

type Choice = 'upload' | 'merge' | 'cloud' | null;

export function MigrationDialog({ open, onClose, onDone }: Props) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async (choice: Exclude<Choice, null>) => {
    setBusy(true);
    try {
      if (choice === 'upload') {
        await migrateLocalToCloud(true);
        await idb.clearAll();
        push('Local data uploaded to your account', 'success');
      } else if (choice === 'merge') {
        await migrateLocalToCloud(false);
        push('Local data merged with cloud', 'success');
      } else if (choice === 'cloud') {
        await idb.clearAll();
        push('Cloud data kept', 'info');
      }
      onDone();
      onClose();
    } catch (e) {
      push('Migration failed. Your local data is safe.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Local data found" maxWidth="max-w-md">
      <p className="text-sm text-[var(--c-textSecondary)] mb-4">
        You have bell profiles stored on this device. Choose how to handle them with your cloud account.
      </p>
      <div className="space-y-2">
        <Button variant="primary" className="w-full justify-start" disabled={busy} onClick={() => handle('upload')}>
          Upload local data to my account
        </Button>
        <Button variant="secondary" className="w-full justify-start" disabled={busy} onClick={() => handle('merge')}>
          Merge local data with cloud data
        </Button>
        <Button variant="secondary" className="w-full justify-start" disabled={busy} onClick={() => handle('cloud')}>
          Keep cloud data only
        </Button>
        <Button variant="ghost" className="w-full justify-start" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

async function migrateLocalToCloud(replaceCloud: boolean) {
  const [profiles, bells, sounds] = await Promise.all([
    idb.getProfiles(),
    idb.getBells(),
    idb.getSounds(),
  ]);

  if (replaceCloud) {
    const cloudProfiles = await cloudProvider.getProfiles();
    for (const p of cloudProfiles) {
      await cloudProvider.deleteProfile(p.id);
    }
  }

  const profileIdMap = new Map<string, string>();
  for (const p of profiles) {
    const created = await cloudProvider.createProfile(p.name);
    profileIdMap.set(p.id, created.id);
    await cloudProvider.updateProfile(created.id, { enabled: p.enabled, sortOrder: p.sortOrder });
  }

  for (const b of bells) {
    const newProfileId = profileIdMap.get(b.profileId);
    if (!newProfileId) continue;
    await cloudProvider.createBell(newProfileId, {
      name: b.name,
      time: b.time,
      repeatDays: b.repeatDays,
      soundId: b.soundId,
      enabled: b.enabled,
      sortOrder: b.sortOrder,
    });
  }

  for (const s of sounds) {
    const blob = await idb.getSoundBlob(s.id);
    if (blob) {
      const file = new File([blob], s.name, { type: s.mimeType });
      await cloudProvider.addSound(s.name, file);
    }
  }
}
