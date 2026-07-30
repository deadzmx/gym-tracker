import { client } from './client';
import { unwrap } from './unwrap';
import type {
  ExerciseSet,
  ExerciseSetInput,
  SessionPatchInput,
  WorkoutSession,
  WorkoutSessionInput,
} from '../types';

export interface SessionListParams {
  from?: string;
  to?: string;
  limit?: number;
}

function unwrapSingle<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function coerceSet<T extends { completed: unknown }>(s: T): T & { completed: boolean } {
  return { ...s, completed: Boolean(s.completed) };
}

export const sessionsApi = {
  list: async (params: SessionListParams = {}): Promise<WorkoutSession[]> => {
    const { data } = await client.get<unknown>('/sessions', { params });
    return unwrap<WorkoutSession>(data);
  },

  get: async (id: number): Promise<WorkoutSession> => {
    const { data } = await client.get<unknown>(`/sessions/${id}`);
    const s = unwrapSingle<WorkoutSession>(data);
    if (s.sets) s.sets = s.sets.map(coerceSet);
    return s;
  },

  start: async (input: WorkoutSessionInput): Promise<WorkoutSession> => {
    const { data } = await client.post<unknown>('/sessions', input);
    return unwrapSingle<WorkoutSession>(data);
  },

  patch: async (id: number, input: SessionPatchInput): Promise<WorkoutSession> => {
    const { data } = await client.patch<unknown>(`/sessions/${id}`, input);
    return unwrapSingle<WorkoutSession>(data);
  },

  remove: async (id: number): Promise<void> => {
    await client.delete(`/sessions/${id}`);
  },
};

export const setsApi = {
  listForSession: async (sessionId: number): Promise<ExerciseSet[]> => {
    const { data } = await client.get<unknown>(`/sessions/${sessionId}/sets`);
    return unwrap<ExerciseSet>(data).map(coerceSet);
  },

  createBatch: async (
    sessionId: number,
    sets: ExerciseSetInput[],
  ): Promise<ExerciseSet[]> => {
    const { data } = await client.post<unknown>(`/sessions/${sessionId}/sets`, {
      sets,
    });
    return unwrap<ExerciseSet>(data).map(coerceSet);
  },

  update: async (id: number, input: Partial<ExerciseSetInput>): Promise<ExerciseSet> => {
    const { data } = await client.put<unknown>(`/sets/${id}`, input);
    const s = unwrapSingle<ExerciseSet>(data);
    return coerceSet(s);
  },

  remove: async (id: number): Promise<void> => {
    await client.delete(`/sets/${id}`);
  },
};
