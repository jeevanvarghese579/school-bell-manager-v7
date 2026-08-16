import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...rest }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)] disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    icon: 'p-2',
  };
  const variants: Record<Variant, string> = {
    primary: 'bg-[var(--c-primary)] text-white hover:bg-[var(--c-primaryHover)]',
    secondary: 'bg-[var(--c-surfaceSecondary)] text-[var(--c-textPrimary)] border border-[var(--c-border)] hover:bg-[var(--c-border)]',
    danger: 'bg-[var(--c-danger)] text-white hover:opacity-90',
    ghost: 'text-[var(--c-textSecondary)] hover:bg-[var(--c-surfaceSecondary)]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
