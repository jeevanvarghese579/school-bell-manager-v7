import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'sbm_profile_width';
const MIN_LEFT = 220;
const MIN_RIGHT = 420;
const DEFAULT_WIDTH = 288;

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function ResizablePanels({ left, right }: Props) {
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const n = saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    return Number.isNaN(n) ? DEFAULT_WIDTH : n;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const maxLeft = containerWidth - MIN_RIGHT;
    let newWidth = e.clientX - rect.left;
    newWidth = Math.max(MIN_LEFT, Math.min(newWidth, maxLeft));
    setWidth(newWidth);
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <aside
        style={{ width, flexShrink: 0 }}
        className="border-r border-[var(--c-border)] bg-[var(--c-surface)] hidden md:flex flex-col overflow-hidden"
      >
        {left}
      </aside>
      <div
        onPointerDown={onPointerDown}
        className="hidden md:flex w-1.5 cursor-col-resize bg-transparent hover:bg-[var(--c-primary)]/20 active:bg-[var(--c-primary)]/40 transition-colors relative group flex-shrink-0"
        style={{ marginLeft: -3, marginRight: 0, width: 12 }}
        aria-label="Drag to resize panels"
        role="separator"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[var(--c-border)] group-hover:bg-[var(--c-primary)]/40" />
      </div>
      <main className="flex-1 flex flex-col bg-[var(--c-background)] overflow-hidden min-w-0">
        {right}
      </main>
    </div>
  );
}
