import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, Empty, Loading, Select } from '../components';
import { exercisesApi } from '../api/exercises';
import { statsApi } from '../api/stats';
import { queryKeys } from '../lib/queryKeys';
import { useState } from 'react';

export default function StatsPage() {
  const [exerciseId, setExerciseId] = useState<string>('');

  const exercisesQ = useQuery({
    queryKey: queryKeys.exercises.list({}),
    queryFn: () => exercisesApi.list({}),
  });

  const effectiveId = exerciseId
    ? Number(exerciseId)
    : (exercisesQ.data?.[0]?.id ?? 0);

  const volumeQ = useQuery({
    queryKey: queryKeys.stats.volume({ exercise_id: effectiveId }),
    queryFn: () => statsApi.volume({ exercise_id: effectiveId }),
    enabled: effectiveId > 0,
  });

  const prQ = useQuery({
    queryKey: queryKeys.stats.pr(effectiveId),
    queryFn: () => statsApi.personalRecords(effectiveId),
    enabled: effectiveId > 0,
  });

  const exerciseOptions = useMemo(
    () =>
      (exercisesQ.data ?? []).map((e) => ({ value: String(e.id), label: e.name })),
    [exercisesQ.data],
  );

  return (
    <div className="space-y-4 md:space-y-6" data-testid="stats-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">统计</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">查看动作的容量曲线和 PR</p>
      </div>

      <Card>
        <div className="max-w-sm">
          <Select
            label="选择动作"
            value={exerciseId || (exercisesQ.data?.[0] ? String(exercisesQ.data[0].id) : '')}
            onChange={(e) => setExerciseId(e.target.value)}
            options={exerciseOptions}
            placeholder="选择动作"
          />
        </div>
      </Card>

      {exercisesQ.isLoading ? (
        <Loading label="加载动作…" />
      ) : effectiveId === 0 ? (
        <Empty title="没有可用的动作" description="请先添加一些动作" />
      ) : (
        <>
          <Card title="容量曲线" description="按日期聚合的容量(kg)">
            {volumeQ.isLoading ? (
              <Loading label="加载容量数据…" />
            ) : (volumeQ.data?.length ?? 0) === 0 ? (
              <Empty title="还没有容量数据" description="完成几组训练就会显示曲线" />
            ) : (
              <div className="h-48 md:h-72 w-full" data-testid="volume-line-chart">
                <ResponsiveContainer>
                  <LineChart data={volumeQ.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${v} kg`} />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="个人记录 (PR)">
            {prQ.isLoading ? (
              <Loading label="加载 PR…" />
            ) : (prQ.data?.length ?? 0) === 0 ? (
              <Empty title="还没有 PR" />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-2">最大重量</th>
                    <th className="py-2">最大容量</th>
                    <th className="py-2">1RM 估算</th>
                    <th className="py-2">达成时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prQ.data?.map((pr, i) => (
                    <tr key={`${pr.exercise_id}-${i}`}>
                      <td className="py-2 font-semibold text-brand-600">
                        {pr.max_weight} kg
                      </td>
                      <td className="py-2">{pr.max_volume} kg</td>
                      <td className="py-2">{pr.estimated_1rm} kg</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">
                        {pr.achieved_at?.slice(0, 10) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
