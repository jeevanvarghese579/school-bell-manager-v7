import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioPreview() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const stop = useCallback(() => { if (audio.current) { audio.current.pause(); audio.current.currentTime = 0; } setPlayingId(null); }, []);
  const toggle = useCallback(async (id: string, getUrl: (id: string) => Promise<string | null>) => {
    if (playingId === id) return stop();
    stop(); const url = await getUrl(id); if (!url) return;
    const player = audio.current ?? (audio.current = new Audio());
    player.src = url; player.onended = () => setPlayingId(null); player.onerror = () => setPlayingId(null);
    await player.play(); setPlayingId(id);
  }, [playingId, stop]);
  useEffect(() => stop, [stop]);
  return { playingId, toggle, stop };
}
