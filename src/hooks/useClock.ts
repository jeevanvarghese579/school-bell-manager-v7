import { useEffect, useState } from 'react';
import { formatClock } from '@/utils/time';

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return formatClock(now);
}
