import { format, parseISO } from 'date-fns';

export function formatDate(iso: string | Date | null | undefined, fmt = 'yyyy-MM-dd'): string {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    return format(d, fmt);
  } catch {
    return '—';
  }
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    return format(d, 'yyyy-MM-dd HH:mm');
  } catch {
    return '—';
  }
}

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function dayOfWeekToday(): number {
  return new Date().getDay();
}

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function dayName(value: number | null | undefined): string {
  if (value === null || value === undefined) return '任意日';
  return DAY_NAMES[value] ?? `星期${value}`;
}

export function setVolume(
  sets: Array<{ reps?: number | null; weight?: number | null; completed?: boolean }>,
): number {
  return sets.reduce((acc, s) => {
    if (s.completed === false) return acc;
    const reps = s.reps ?? 0;
    const weight = s.weight ?? 0;
    return acc + reps * weight;
  }, 0);
}

export function classNames(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ');
}

export const queryKeys = {
  exercises: {
    all: ['exercises'] as const,
    list: (params: Record<string, unknown> = {}) =>
      ['exercises', 'list', params] as const,
    detail: (id: number) => ['exercises', 'detail', id] as const,
  },
  plans: {
    all: ['plans'] as const,
    list: () => ['plans', 'list'] as const,
    detail: (id: number) => ['plans', 'detail', id] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    list: (params: Record<string, unknown> = {}) =>
      ['sessions', 'list', params] as const,
    detail: (id: number) => ['sessions', 'detail', id] as const,
    sets: (sessionId: number) => ['sessions', sessionId, 'sets'] as const,
  },
  stats: {
    summary: () => ['stats', 'summary'] as const,
    volume: (params: Record<string, unknown>) => ['stats', 'volume', params] as const,
    pr: (exerciseId: number) => ['stats', 'pr', exerciseId] as const,
  },
} as const;
