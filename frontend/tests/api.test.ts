import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { ApiClientError } from '../src/api/client';

// We mock the underlying axios instance with a real interceptor chain so the
// ApiClientError transformation in src/api/client.ts is exercised end-to-end.
const axiosMock = vi.hoisted(() => {
  type Fulfilled = (resp: unknown) => unknown | Promise<unknown>;
  type Rejected = (err: unknown) => unknown;
  const fulfilled: Fulfilled[] = [];
  const rejected: Rejected[] = [];

  const run = async <T>(promise: Promise<T>): Promise<T> => {
    try {
      let v: unknown = await promise;
      for (const f of fulfilled) v = await f(v);
      return v as T;
    } catch (e) {
      let cur: unknown = e;
      for (const r of rejected) {
        try {
          cur = await r(cur);
          // If a rejected handler returned a value, treat as resolved
          return cur as T;
        } catch (rej) {
          cur = rej;
        }
      }
      throw cur;
    }
  };

  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const patch = vi.fn();
  const del = vi.fn();

  const instance = {
    get: (...a: unknown[]) => run(get(...a)),
    post: (...a: unknown[]) => run(post(...a)),
    put: (...a: unknown[]) => run(put(...a)),
    patch: (...a: unknown[]) => run(patch(...a)),
    delete: (...a: unknown[]) => run(del(...a)),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: {
        use: (onFulfilled?: Fulfilled, onRejected?: Rejected) => {
          if (onFulfilled) fulfilled.push(onFulfilled);
          if (onRejected) rejected.push(onRejected);
        },
        eject: vi.fn(),
      },
    },
  };
  return { instance, get, post, put, patch, del };
});

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => axiosMock.instance),
      isAxiosError: actual.default.isAxiosError.bind(actual.default),
    },
    isAxiosError: actual.default.isAxiosError.bind(actual.default),
  };
});

// Import after the mock is set up so src/api/client.ts picks up the mock.
const { exercisesApi } = await import('../src/api/exercises');
const { plansApi } = await import('../src/api/plans');
const { sessionsApi, setsApi } = await import('../src/api/sessions');
const { statsApi } = await import('../src/api/stats');
import type { Exercise, WorkoutPlan, WorkoutSession } from '../src/types';

function makeAxiosError(status: number, code: string, message: string) {
  const err = new axios.AxiosError(message);
  err.response = {
    status,
    statusText: 'Error',
    headers: {},
    config: {} as never,
    data: { error: { code, message } },
  };
  return err;
}

describe('exercisesApi', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.put.mockReset();
    axiosMock.patch.mockReset();
    axiosMock.del.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('list() returns data on success', async () => {
    const fake: Exercise[] = [
      {
        id: 1,
        name: 'Bench Press',
        category: '胸',
        equipment: '杠铃',
        primary_muscle: 'pectoralis',
        description: 'desc',
        image_url: '🏋️',
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ];
    axiosMock.get.mockResolvedValue({ data: fake });
    const result = await exercisesApi.list();
    expect(result).toEqual(fake);
    expect(axiosMock.get).toHaveBeenCalledWith('/exercises', { params: {} });
  });

  it('list({ category }) forwards query params', async () => {
    axiosMock.get.mockResolvedValue({ data: [] });
    await exercisesApi.list({ category: '胸' });
    expect(axiosMock.get).toHaveBeenCalledWith('/exercises', { params: { category: '胸' } });
  });

  it('get() rejects with ApiClientError on 404', async () => {
    axiosMock.get.mockRejectedValue(makeAxiosError(404, 'NOT_FOUND', 'gone'));
    await expect(exercisesApi.get(999)).rejects.toBeInstanceOf(ApiClientError);
  });

  it('get() rejects with ApiClientError on 500', async () => {
    axiosMock.get.mockRejectedValue(makeAxiosError(500, 'INTERNAL', 'boom'));
    await expect(exercisesApi.get(1)).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL',
      message: 'boom',
    });
  });
});

describe('plansApi', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.put.mockReset();
    axiosMock.patch.mockReset();
    axiosMock.del.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('create() POSTs payload to /plans', async () => {
    const plan: WorkoutPlan = {
      id: 1,
      name: 'Push',
      description: 'desc',
      day_of_week: 1,
      created_at: '2024-01-01T00:00:00.000Z',
    };
    axiosMock.post.mockResolvedValue({ data: plan });
    const r = await plansApi.create({ name: 'Push', day_of_week: 1, exercises: [] });
    expect(axiosMock.post).toHaveBeenCalledWith('/plans', {
      name: 'Push',
      day_of_week: 1,
      exercises: [],
    });
    expect(r).toEqual(plan);
  });

  it('update() PUTs to /plans/:id', async () => {
    axiosMock.put.mockResolvedValue({ data: { id: 1, name: 'x' } });
    await plansApi.update(1, { name: 'x' });
    expect(axiosMock.put).toHaveBeenCalledWith('/plans/1', { name: 'x' });
  });

  it('remove() DELETEs /plans/:id', async () => {
    axiosMock.del.mockResolvedValue({ data: null });
    await plansApi.remove(1);
    expect(axiosMock.del).toHaveBeenCalledWith('/plans/1');
  });
});

describe('sessionsApi', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.patch.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('start() POSTs to /sessions', async () => {
    const session: WorkoutSession = {
      id: 7,
      plan_id: 2,
      session_date: '2024-07-29',
      started_at: '2024-07-29T08:00:00.000Z',
      finished_at: null,
      notes: null,
    };
    axiosMock.post.mockResolvedValue({ data: session });
    const r = await sessionsApi.start({ plan_id: 2, session_date: '2024-07-29' });
    expect(axiosMock.post).toHaveBeenCalledWith('/sessions', {
      plan_id: 2,
      session_date: '2024-07-29',
    });
    expect(r.id).toBe(7);
  });

  it('patch() PATCHes /sessions/:id', async () => {
    axiosMock.patch.mockResolvedValue({ data: { id: 7 } });
    await sessionsApi.patch(7, { finished_at: 'x' });
    expect(axiosMock.patch).toHaveBeenCalledWith('/sessions/7', { finished_at: 'x' });
  });
});

describe('setsApi', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    axiosMock.put.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('createBatch() wraps in { sets: [...] }', async () => {
    axiosMock.post.mockResolvedValue({ data: [{ id: 1 }] });
    await setsApi.createBatch(7, [
      { exercise_id: 1, set_index: 1, reps: 8, weight: 60, rpe: 7, completed: true },
    ]);
    expect(axiosMock.post).toHaveBeenCalledWith('/sessions/7/sets', {
      sets: [{ exercise_id: 1, set_index: 1, reps: 8, weight: 60, rpe: 7, completed: true }],
    });
  });

  it('update() PUTs /sets/:id', async () => {
    axiosMock.put.mockResolvedValue({ data: { id: 1 } });
    await setsApi.update(1, { reps: 10 });
    expect(axiosMock.put).toHaveBeenCalledWith('/sets/1', { reps: 10 });
  });
});

describe('statsApi', () => {
  beforeEach(() => {
    axiosMock.get.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('summary() hits /stats/summary', async () => {
    axiosMock.get.mockResolvedValue({
      data: { total_sessions: 5, total_volume: 1234, streak_days: 3 },
    });
    const r = await statsApi.summary();
    expect(axiosMock.get).toHaveBeenCalledWith('/stats/summary');
    expect(r).toEqual({ total_sessions: 5, total_volume: 1234, streak_days: 3 });
  });

  it('volume() forwards query params', async () => {
    axiosMock.get.mockResolvedValue({ data: [{ date: '2024-07-29', volume: 100, sets: 2 }] });
    await statsApi.volume({ exercise_id: 1, from: '2024-07-01' });
    expect(axiosMock.get).toHaveBeenCalledWith('/stats/volume', {
      params: { exercise_id: 1, from: '2024-07-01' },
    });
  });

  it('personalRecords() includes exercise_id', async () => {
    axiosMock.get.mockResolvedValue({ data: [] });
    await statsApi.personalRecords(1);
    expect(axiosMock.get).toHaveBeenCalledWith('/stats/personal-records', {
      params: { exercise_id: 1 },
    });
  });
});
