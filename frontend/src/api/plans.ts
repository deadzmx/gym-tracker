import { client } from './client';
import { unwrap } from './unwrap';
import type { WorkoutPlan, WorkoutPlanInput } from '../types';

export const plansApi = {
  list: async (): Promise<WorkoutPlan[]> => {
    const { data } = await client.get<unknown>('/plans');
    return unwrap<WorkoutPlan>(data);
  },

  get: async (id: number): Promise<WorkoutPlan> => {
    const { data } = await client.get<unknown>(`/plans/${id}`);
    const plan = (data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data) as WorkoutPlan;
    return plan;
  },

  create: async (input: WorkoutPlanInput): Promise<WorkoutPlan> => {
    const { data } = await client.post<unknown>('/plans', input);
    const plan = (data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data) as WorkoutPlan;
    return plan;
  },

  update: async (id: number, input: WorkoutPlanInput): Promise<WorkoutPlan> => {
    const { data } = await client.put<unknown>(`/plans/${id}`, input);
    const plan = (data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data) as WorkoutPlan;
    return plan;
  },

  remove: async (id: number): Promise<void> => {
    await client.delete(`/plans/${id}`);
  },
};
