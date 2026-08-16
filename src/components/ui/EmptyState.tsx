import type { ReactNode } from 'react';

interface Props {
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <h3 className="text-base font-semibold text-[var(--c-textPrimary)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--c-textSecondary)] mb-4 max-w-xs">{message}</p>
      {action}
    </div>
  );
}
