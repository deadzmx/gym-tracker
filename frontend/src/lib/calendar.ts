// Calendar utilities — month grid generation, date arithmetic.

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function parseIsoDate(s: string): Date {
  // s = "YYYY-MM-DD" — parse as UTC noon to avoid TZ issues
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export interface CalendarCell {
  date: string;        // YYYY-MM-DD
  day: number;         // 1-31
  inMonth: boolean;     // false = belongs to prev/next month
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;       // 1-12
  monthLabel: string;  // "2026年7月"
  weeks: CalendarCell[][];  // 6 weeks × 7 days
  firstDate: string;
  lastDate: string;
}

// Generate a 6-week calendar grid (42 cells) for the given year/month.
// Cells from prev/next months are included with inMonth=false.
export function buildMonth(year: number, month: number): CalendarMonth {
  // First day of the month (UTC)
  const first = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstDayOfWeek = first.getUTCDay(); // 0=Sun, 6=Sat
  // Start grid on the Sunday on or before the first of the month
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - firstDayOfWeek);

  // Build 6 weeks (42 days) — guarantees same shape every month
  const weeks: CalendarCell[][] = [];
  const todayStr = isoDate(new Date());
  const cursor = new Date(gridStart);

  for (let w = 0; w < 6; w++) {
    const week: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = isoDate(cursor);
      week.push({
        date: dateStr,
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month - 1,
        isToday: dateStr === todayStr,
        isWeekend: d === 0 || d === 6,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  // Last day of the month for range
  const last = new Date(Date.UTC(year, month, 0, 12, 0, 0));

  return {
    year,
    month,
    monthLabel: `${year}年${month}月`,
    weeks,
    firstDate: isoDate(first),
    lastDate: isoDate(last),
  };
}

export function addMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

// Group sessions by date (YYYY-MM-DD) for a given month grid.
export function groupSessionsByDate<T extends { session_date: string }>(
  sessions: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const s of sessions) {
    const arr = map.get(s.session_date) ?? [];
    arr.push(s);
    map.set(s.session_date, arr);
  }
  return map;
}
