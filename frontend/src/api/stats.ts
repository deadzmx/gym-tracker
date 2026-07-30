import { client } from './client';
import { unwrap } from './unwrap';
import type { CalendarHeatmapDay, PersonalRecord, StatsSummary, VolumePoint } from '../types';

export interface VolumeParams {
  exercise_id: number;
  from?: string;
  to?: string;
}

export interface CalendarParams {
  from?: string;
  to?: string;
}

// Raw backend response shape may use slightly different field names. Normalize.
interface RawSummary {
  total_sessions?: number;
  total_volume?: number;
  total_volume_kg?: number;
  streak_days?: number;
  current_streak_days?: number;
  last_7_days_volume?: Array<{ date: string; volume: number }>;
}

interface RawVolumePoint {
  date: string;
  volume: number;
  sets?: number;
  sets_count?: number;
}

function normalizeSummary(raw: RawSummary): StatsSummary {
  return {
    total_sessions: raw.total_sessions ?? 0,
    total_volume: raw.total_volume ?? raw.total_volume_kg ?? 0,
    streak_days: raw.streak_days ?? raw.current_streak_days ?? 0,
  };
}

function normalizeVolume(raw: RawVolumePoint): VolumePoint {
  return {
    date: raw.date,
    volume: raw.volume,
    sets: raw.sets ?? raw.sets_count ?? 0,
  };
}

export const statsApi = {
  summary: async (): Promise<StatsSummary> => {
    const { data } = await client.get<unknown>('/stats/summary');
    const raw = (data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data) as RawSummary;
    return normalizeSummary(raw);
  },

  volume: async (params: VolumeParams): Promise<VolumePoint[]> => {
    const { data } = await client.get<unknown>('/stats/volume', { params });
    const list = unwrap<RawVolumePoint>(data);
    return list.map(normalizeVolume);
  },

  personalRecords: async (exerciseId: number): Promise<PersonalRecord[]> => {
    const { data } = await client.get<unknown>(
      '/stats/personal-records',
      { params: { exercise_id: exerciseId } },
    );
    return unwrap<PersonalRecord>(data);
  },

  calendar: async (params: CalendarParams = {}): Promise<CalendarHeatmapDay[]> => {
    const { data } = await client.get<unknown>('/stats/calendar', { params });
    return unwrap<CalendarHeatmapDay>(data);
  },
};
