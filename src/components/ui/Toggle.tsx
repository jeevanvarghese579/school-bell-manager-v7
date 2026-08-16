interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, size = 'md' }: Props) {
  const w = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const knob = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative ${w} rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)] ${
        checked ? 'bg-[var(--c-success)]' : 'bg-[var(--c-disabled)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 ${knob} bg-white rounded-full shadow transition-transform ${
          checked ? translate : 'translate-x-0'
        }`}
        style={{ width: size === 'sm' ? 14 : 18, height: size === 'sm' ? 14 : 18 }}
      />
    </button>
  );
}
