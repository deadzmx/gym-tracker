import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo } from 'react';
import { plansApi } from '../api/plans';
import { sessionsApi, setsApi } from '../api/sessions';
import { statsApi } from '../api/stats';
import { exercisesApi } from '../api/exercises';
import { Button, CalendarHeatmap, Card, Empty, Loading } from '../components';
import { dayName, dayOfWeekToday, formatDate, queryKeys, setVolume } from '../lib/queryKeys';

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function DashboardPage() {
  const todayDow = dayOfWeekToday();

  const plansQ = useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: plansApi.list,
  });
  const sessionsQ = useQuery({
    queryKey: queryKeys.sessions.list({ limit: 30 }),
    queryFn: () => sessionsApi.list({ limit: 30 }),
  });
  const summaryQ = useQuery({
    queryKey: queryKeys.stats.summary(),
    queryFn: statsApi.summary,
  });
  const calendarQ = useQuery({
    queryKey: ['stats', 'calendar', '12w'],
    queryFn: () => statsApi.calendar(),
  });

  const todaysPlan = useMemo(() => {
    if (!plansQ.data) return null;
    return plansQ.data.find((p) => p.day_of_week === todayDow) ?? null;
  }, [plansQ.data, todayDow]);

  const volumeByDay = useMemo(() => {
    const dates = lastNDates(7);
    const map = new Map<string, number>();
    dates.forEach((d) => map.set(d, 0));
    return dates.map((date) => {
      let v = 0;
      if (sessionsQ.data) {
        sessionsQ.data
          .filter((s) => s.session_date === date)
          .forEach((s) => {
            if (typeof s.total_volume === 'number') {
              v += s.total_volume;
            }
          });
      }
      return { date, volume: v };
    });
  }, [sessionsQ.data]);

  // PR cards: pull recent PRs (top 3 by max_weight) using sessions detail sets
  const prsQ = useQuery({
    queryKey: ['dashboard', 'prs', sessionsQ.data?.slice(0, 10).map((s) => s.id).join(',')],
    enabled: (sessionsQ.data?.length ?? 0) > 0,
    queryFn: async () => {
      const sessions = (sessionsQ.data ?? []).slice(0, 10);
      const allSets: Array<{ exercise_id: number; weight: number; reps: number }> = [];
      for (const s of sessions) {
        try {
          const sets = await setsApi.listForSession(s.id);
          for (const set of sets) {
            if (set.completed) {
              allSets.push({
                exercise_id: set.exercise_id,
                weight: set.weight,
                reps: set.reps,
              });
            }
          }
        } catch {
          // ignore individual session errors
        }
      }
      const byExercise = new Map<number, { max_weight: number; max_volume: number }>();
      for (const s of allSets) {
        const cur = byExercise.get(s.exercise_id) ?? { max_weight: 0, max_volume: 0 };
        cur.max_weight = Math.max(cur.max_weight, s.weight);
        cur.max_volume = Math.max(cur.max_volume, s.weight * s.reps);
        byExercise.set(s.exercise_id, cur);
      }
      return Array.from(byExercise.entries())
        .map(([exercise_id, v]) => ({ exercise_id, ...v }))
        .sort((a, b) => b.max_weight - a.max_weight)
        .slice(0, 3);
    },
  });

  const exercisesQ = useQuery({
    queryKey: queryKeys.exercises.list({}),
    queryFn: () => exercisesApi.list(),
  });
  const exerciseName = (id: number): string =>
    exercisesQ.data?.find((e) => e.id === id)?.name ?? `动作 #${id}`;

  const isLoading = plansQ.isLoading || sessionsQ.isLoading || summaryQ.isLoading;

  if (isLoading) return <Loading label="加载 Dashboard 数据…" />;

  return (
    <div className="space-y-4 md:space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            今天 {dayName(todayDow)} · {formatDate(new Date())}
          </p>
        </div>
        {todaysPlan ? (
          <Link to={`/workout?plan_id=${todaysPlan.id}`} className="self-start sm:self-auto">
            <Button className="w-full sm:w-auto">开始 {todaysPlan.name}</Button>
          </Link>
        ) : null}
      </div>

      {/* 推荐计划 */}
      <Card title="今日推荐" description={dayName(todayDow)}>
        {todaysPlan ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 dark:text-slate-100">{todaysPlan.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {todaysPlan.description ?? '今天就该练这个'}
              </p>
            </div>
            <Link to={`/plans/${todaysPlan.id}`}>
              <Button variant="secondary" className="w-full sm:w-auto">查看计划</Button>
            </Link>
          </div>
        ) : (
          <Empty
            title="今天没有安排"
            description="去计划页新建或编辑一个匹配今天的计划"
            action={
              <Link to="/plans/new">
                <Button>新建计划</Button>
              </Link>
            }
          />
        )}
      </Card>

      {/* 最近 7 天容量 */}
      <Card title="最近 7 天训练容量" description="单位:kg(重量 × 次数)">
        {volumeByDay.every((d) => d.volume === 0) ? (
          <Empty title="最近 7 天没有训练" description="开始你的第一次训练吧" />
        ) : (
          <div className="h-44 md:h-60 w-full" data-testid="volume-chart">
            <ResponsiveContainer>
              <BarChart data={volumeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v} kg`} />
                <Bar dataKey="volume" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 训练日历热力图 (12 周) */}
      <Card
        title="训练日历"
        description="过去 12 周 · 每天颜色越深训练越多"
      >
        {calendarQ.isLoading ? (
          <Loading label="加载日历…" />
        ) : (
          <CalendarHeatmap data={calendarQ.data ?? []} weeks={12} />
        )}
      </Card>

      {/* 摘要 + PR */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="总训练次数">
          <p className="text-3xl font-bold text-brand-600">
            {summaryQ.data?.total_sessions ?? sessionsQ.data?.length ?? 0}
          </p>
        </Card>
        <Card title="总容量 (kg)">
          <p className="text-3xl font-bold text-brand-600">
            {summaryQ.data?.total_volume?.toLocaleString() ??
              sessionsQ.data
                ?.reduce(
                  (acc, s) => acc + (s.total_volume ?? 0),
                  0,
                )
                .toLocaleString() ??
              0}
          </p>
        </Card>
        <Card title="连续打卡(天)">
          <p className="text-3xl font-bold text-brand-600">
            {summaryQ.data?.streak_days ?? 0}
          </p>
        </Card>
      </div>

      <Card title="个人记录 (PR)" description="按最大重量排序,最近 10 次训练">
        {prsQ.isLoading ? (
          <Loading label="加载 PR…" />
        ) : (prsQ.data?.length ?? 0) === 0 ? (
          <Empty title="还没有 PR" description="完成几组训练就会出现在这里" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(prsQ.data ?? []).map((pr) => (
              <li
                key={pr.exercise_id}
                className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 p-4"
              >
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {exerciseName(pr.exercise_id)}
                </p>
                <p className="mt-2 text-2xl font-bold text-brand-600">
                  {pr.max_weight} kg
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  单次最大容量 {setVolume([
                    { reps: 1, weight: pr.max_weight, completed: true },
                  ])}{' '}
                  kg · 1RM 估算{' '}
                  {Math.round(pr.max_weight * (1 + 1 / 30))} kg
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
