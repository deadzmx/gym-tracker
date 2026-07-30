// Calendar heatmap: GitHub-style contribution graph for training sessions.
// Uses SVG for crispness + small bundle size. Dark-mode aware via CSS classes.

import { useMemo } from 'react';
import clsx from 'clsx';

export interface CalendarHeatmapDay {
  date: string; // YYYY-MM-DD
  session_count: number;
  set_count: number;
  total_volume_kg: number;
}

export interface CalendarHeatmapProps {
  data: CalendarHeatmapDay[];
  weeks?: number; // number of weeks to display (default 12)
  className?: string;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function levelForSessions(n: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (n <= 0) return 0;
  const ratio = n / Math.max(1, max);
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

// Tailwind classes for each level — light & dark variants
const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'fill-slate-100 dark:fill-slate-800',
  1: 'fill-emerald-100 dark:fill-emerald-900',
  2: 'fill-emerald-300 dark:fill-emerald-700',
  3: 'fill-emerald-500 dark:fill-emerald-500',
  4: 'fill-emerald-700 dark:fill-emerald-400',
};

// Legend colors (inline style for reliable rendering)
const LEGEND_COLORS = [
  { light: '#f1f5f9', dark: '#1e293b' },
  { light: '#d1fae5', dark: '#064e3b' },
  { light: '#6ee7b7', dark: '#047857' },
  { light: '#10b981', dark: '#10b981' },
  { light: '#047857', dark: '#34d399' },
];

export function CalendarHeatmap({ data, weeks = 12, className }: CalendarHeatmapProps) {
  const { grid, monthLabels, maxSessions, totalSessions, totalDays } = useMemo(() => {
    const map = new Map<string, CalendarHeatmapDay>();
    for (const d of data) map.set(d.date, d);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endSat = new Date(today);
    endSat.setUTCDate(endSat.getUTCDate() + (6 - endSat.getUTCDay()));

    const startSun = new Date(endSat);
    startSun.setUTCDate(startSun.getUTCDate() - (weeks * 7) + 1);

    const grid: (CalendarHeatmapDay | null)[][] = Array.from({ length: 7 }, () => []);
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    let maxSessions = 0;
    let totalSessions = 0;
    let totalDays = 0;

    const cursor = new Date(startSun);
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        const day = map.get(iso) ?? null;
        grid[d].push(day);
        if (day && day.session_count > 0) {
          totalSessions += day.session_count;
          totalDays += 1;
          if (day.session_count > maxSessions) maxSessions = day.session_count;
        }
        if (d === 0) {
          const m = cursor.getUTCMonth();
          if (m !== lastMonth) {
            monthLabels.push({ col: w, label: MONTH_LABELS[m] });
            lastMonth = m;
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return { grid, monthLabels, maxSessions, totalSessions, totalDays };
  }, [data, weeks]);

  const cellSize = 14;
  const cellGap = 3;
  const monthLabelHeight = 18;
  const dayLabelWidth = 22;

  const width = dayLabelWidth + weeks * (cellSize + cellGap);
  const height = monthLabelHeight + 7 * (cellSize + cellGap);

  return (
    <div className={className} data-testid="calendar-heatmap">
      <div className="mb-3 flex items-baseline justify-between text-sm">
        <div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSessions}</span>
          <span className="ml-1.5 text-slate-500 dark:text-slate-400">次训练 · </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalDays}</span>
          <span className="ml-1.5 text-slate-500 dark:text-slate-400">个训练日</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <span>少</span>
          {LEGEND_COLORS.map((c, i) => (
            <span
              key={i}
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: c.light }}
            />
          ))}
          <span>多</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          role="img"
          aria-label="过去 12 周训练日历热力图"
        >
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={dayLabelWidth + m.col * (cellSize + cellGap)}
              y={12}
              className="fill-slate-500 dark:fill-slate-400"
              fontSize={10}
            >
              {m.label}
            </text>
          ))}
          {[1, 3, 5].map((d) => (
            <text
              key={d}
              x={0}
              y={monthLabelHeight + d * (cellSize + cellGap) + cellSize - 2}
              className="fill-slate-400 dark:fill-slate-500"
              fontSize={10}
            >
              {DAY_LABELS[d]}
            </text>
          ))}
          {grid.map((row, d) =>
            row.map((day, w) => {
              const level = day ? levelForSessions(day.session_count, maxSessions) : 0;
              const x = dayLabelWidth + w * (cellSize + cellGap);
              const y = monthLabelHeight + d * (cellSize + cellGap);
              return (
                <rect
                  key={`${d}-${w}`}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  className={clsx(LEVEL_CLASSES[level], 'transition-opacity hover:opacity-70')}
                  data-date={day?.date}
                  data-sessions={day?.session_count ?? 0}
                >
                  {day ? (
                    <title>
                      {day.date}: {day.session_count} 次训练, {day.set_count} 组, {day.total_volume_kg}kg
                    </title>
                  ) : null}
                </rect>
              );
            }),
          )}
        </svg>
      </div>
    </div>
  );
}
