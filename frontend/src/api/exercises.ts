import { client } from './client';
import { unwrap } from './unwrap';
import type { Exercise, ExerciseCategory, ExerciseInput } from '../types';

export interface ExerciseListParams {
  category?: ExerciseCategory;
  search?: string;
}

export const exercisesApi = {
  list: async (params: ExerciseListParams = {}): Promise<Exercise[]> => {
    const { data } = await client.get<unknown>('/exercises', { params });
    return unwrap<Exercise>(data);
  },

  get: async (id: number): Promise<Exercise> => {
    const { data } = await client.get<unknown>(`/exercises/${id}`);
    return (data && typeof data === 'object' && 'data' in data
      ? (data as { data: Exercise }).data
      : (data as Exercise));
  },

  create: async (input: ExerciseInput): Promise<Exercise> => {
    const { data } = await client.post<Exercise>('/exercises', input);
    return data;
  },

  update: async (id: number, input: Partial<ExerciseInput>): Promise<Exercise> => {
    const { data } = await client.put<Exercise>(`/exercises/${id}`, input);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await client.delete(`/exercises/${id}`);
  },
};
