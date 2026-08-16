export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function to24h(time: string): string {
  return time; // already HH:mm
}

export function to12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.padStart(2, '0')} ${period}`;
}

export function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function todayKey(): number {
  return new Date().getDay();
}

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Empty repeatDays = "Daily" — fires every day at the scheduled time.
 * Non-empty = fires only on the specified days of week.
 */
export function formatRepeat(days: number[]): string {
  if (!days || days.length === 0) return 'Daily';
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 1) return DAYS_FULL[sorted[0]];
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Weekdays';
  if (sorted.length === 2 && sorted.join(',') === '0,6') return 'Weekends';
  return sorted.map((d) => DAYS[d]).join(', ');
}

/**
 * A bell fires on a given day-of-week if:
 * - repeatDays is empty (Daily = no day restriction)
 * - repeatDays includes that day
 */
export function bellFiresOnDay(days: number[], dayOfWeek: number): boolean {
  if (!days || days.length === 0) return true;
  return days.includes(dayOfWeek);
}

export function bellFiresToday(days: number[]): boolean {
  return bellFiresOnDay(days, todayKey());
}

export function formatClock(d: Date): { time: string; date: string } {
  let h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const time = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${period}`;
  const date = `${DAYS_FULL[d.getDay()]}, ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}`;
  return { time, date };
}

export interface SchedulableBell {
  id: string;
  name: string;
  time: string;
  repeatDays: number[];
  enabled: boolean;
  profileEnabled: boolean;
  soundId?: string | null;
}

/**
 * Calculate the next upcoming bell from the current local time.
 * Returns null if no bell is scheduled for today (or future days within a week).
 * Looks ahead up to 7 days to handle repeat-day configurations.
 */
export function getNextBell(
  bells: SchedulableBell[],
  masterEnabled: boolean,
  from: Date = new Date(),
): { bell: SchedulableBell; at: Date } | null {
  if (!masterEnabled) return null;

  const eligible = bells.filter((b) => b.enabled && b.profileEnabled);
  if (eligible.length === 0) return null;

  const nowHHmm = `${String(from.getHours()).padStart(2, '0')}:${String(from.getMinutes()).padStart(2, '0')}`;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(from);
    checkDate.setDate(from.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();

    const dayBells = eligible
      .filter((b) => bellFiresOnDay(b.repeatDays, dayOfWeek))
      .filter((b) => dayOffset > 0 || b.time > nowHHmm)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (dayBells.length > 0) {
      const bell = dayBells[0];
      const [h, m] = bell.time.split(':').map(Number);
      const at = new Date(checkDate);
      at.setHours(h, m, 0, 0);
      return { bell, at };
    }
  }

  return null;
}
