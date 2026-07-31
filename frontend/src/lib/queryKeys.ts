// React Query key factory. Centralizes all cache keys so a refactor
// (renaming, adding a filter) only needs to change here.

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
