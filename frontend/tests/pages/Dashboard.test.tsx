import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../../src/pages/Dashboard';

vi.mock('recharts', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-pass' }, children as React.ReactNode);
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        'div',
        { 'data-testid': 'recharts-responsive', style: { width: 600, height: 240 } },
        children as React.ReactNode,
      ),
    BarChart: Passthrough,
    LineChart: Passthrough,
    Bar: () => React.createElement('div', { 'data-testid': 'recharts-bar' }),
    Line: () => React.createElement('div', { 'data-testid': 'recharts-line' }),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  };
});

vi.mock('../../src/api/plans', () => ({
  plansApi: {
    list: vi.fn(),
  },
}));
vi.mock('../../src/api/sessions', () => ({
  sessionsApi: {
    list: vi.fn(),
  },
  setsApi: {
    listForSession: vi.fn(),
  },
}));
vi.mock('../../src/api/stats', () => ({
  statsApi: {
    summary: vi.fn(),
    calendar: vi.fn(),
  },
}));
vi.mock('../../src/api/exercises', () => ({
  exercisesApi: {
    list: vi.fn(),
  },
}));

import { plansApi } from '../../src/api/plans';
import { sessionsApi, setsApi } from '../../src/api/sessions';
import { statsApi } from '../../src/api/stats';
import { exercisesApi } from '../../src/api/exercises';
import { ToastProvider } from '../../src/components';

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(plansApi.list).mockResolvedValue([
      {
        id: 1,
        name: '推日',
        description: '胸+肩+三头',
        day_of_week: new Date().getDay(),
        created_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        name: '腿日',
        description: null,
        day_of_week: 0,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ]);
    const today = new Date().toISOString().slice(0, 10);
    vi.mocked(sessionsApi.list).mockResolvedValue([
      {
        id: 100,
        plan_id: 1,
        session_date: today,
        started_at: `${today}T08:00:00.000Z`,
        finished_at: `${today}T09:00:00.000Z`,
        notes: null,
        total_volume: 2400,
      },
    ]);
    vi.mocked(setsApi.listForSession).mockResolvedValue([
      {
        id: 1,
        session_id: 100,
        exercise_id: 1,
        plan_exercise_id: null,
        set_index: 1,
        reps: 8,
        weight: 60,
        rpe: null,
        completed: true,
      },
    ]);
    vi.mocked(statsApi.summary).mockResolvedValue({
      total_sessions: 12,
      total_volume: 24000,
      streak_days: 3,
    });
    vi.mocked(statsApi.calendar).mockResolvedValue([]);
    vi.mocked(exercisesApi.list).mockResolvedValue([
      {
        id: 1,
        name: '杠铃卧推',
        category: 'chest',
        equipment: 'barbell',
        primary_muscle: 'chest',
        description: null,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('renders title and summary cards', async () => {
    renderDashboard();
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(await screen.findByText('总训练次数')).toBeInTheDocument();
    expect(await screen.findByText('总容量 (kg)')).toBeInTheDocument();
    expect(await screen.findByText('连续打卡(天)')).toBeInTheDocument();
  });

  it('renders volume chart with data from sessions', async () => {
    renderDashboard();
    // Wait for the chart container to mount
    const chart = await screen.findByTestId('volume-chart');
    expect(chart).toBeInTheDocument();
    // Recharts mocked — verify a Bar got rendered
    await waitFor(() => {
      expect(chart.querySelector('[data-testid="recharts-bar"]')).toBeTruthy();
    });
  });

  it('shows today’s recommended plan based on day_of_week', async () => {
    renderDashboard();
    // We seeded a plan with day_of_week = today, so its name should appear
    expect(await screen.findByText('推日')).toBeInTheDocument();
  });
});
