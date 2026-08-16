import { useToast } from '@/hooks/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastHost() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] shadow-lg min-w-[240px] animate-[slideIn_0.2s_ease]"
        >
          {t.kind === 'success' && <CheckCircle2 size={18} className="text-[var(--c-success)]" />}
          {t.kind === 'error' && <AlertCircle size={18} className="text-[var(--c-danger)]" />}
          {t.kind === 'info' && <Info size={18} className="text-[var(--c-primary)]" />}
          <span className="text-sm text-[var(--c-textPrimary)] flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-[var(--c-textSecondary)] hover:text-[var(--c-textPrimary)]">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
