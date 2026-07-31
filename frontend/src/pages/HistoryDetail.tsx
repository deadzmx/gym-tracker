import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { sessionsApi, setsApi } from '../api/sessions';
import { Button, Card, Empty, Input, Loading, useToast } from '../components';
import { queryKeys } from '../lib/queryKeys'
import { formatDate, formatDateTime, setVolume } from '../lib/format';
import type { ExerciseSet } from '../types';

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const qc = useQueryClient();
  const toast = useToast();

  const sessionQ = useQuery({
    queryKey: queryKeys.sessions.detail(sessionId),
    queryFn: () => sessionsApi.get(sessionId),
    enabled: !Number.isNaN(sessionId),
  });
  const setsQ = useQuery({
    queryKey: queryKeys.sessions.sets(sessionId),
    queryFn: () => setsApi.listForSession(sessionId),
    enabled: !Number.isNaN(sessionId),
  });

  const updateMut = useMutation({
    mutationFn: ({ id: setId, input }: { id: number; input: Partial<ExerciseSet> }) =>
      setsApi.update(setId, {
        reps: input.reps,
        weight: input.weight,
        completed: input.completed,
        rpe: input.rpe ?? null,
      }),
    onSuccess: () => {
      toast.push('success', '已保存');
      qc.invalidateQueries({ queryKey: queryKeys.sessions.sets(sessionId) });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });
    },
    onError: (e: Error) => toast.push('error', e.message ?? '保存失败'),
  });

  const removeMut = useMutation({
    mutationFn: (setId: number) => setsApi.remove(setId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions.sets(sessionId) });
    },
  });

  if (sessionQ.isLoading || setsQ.isLoading)
    return <Loading label="加载训练详情…" />;
  if (sessionQ.error || setsQ.error)
    return (
      <Empty
        title="加载失败"
        description={
          ((sessionQ.error || setsQ.error) as Error)?.message ?? '未知错误'
        }
      />
    );

  const session = sessionQ.data;
  const sets = setsQ.data ?? [];
  if (!session) return <Empty title="训练不存在" />;

  const grouped = sets.reduce<Record<number, ExerciseSet[]>>((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = [];
    acc[s.exercise_id].push(s);
    return acc;
  }, {});

  const totalVolume = setVolume(
    sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed })),
  );

  return (
    <div className="space-y-6" data-testid="history-detail-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatDate(session.session_date)} ·{' '}
            {session.plan?.name ?? (session.plan_id ? `计划 #${session.plan_id}` : '自由训练')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDateTime(session.started_at)}
            {session.finished_at ? ` → ${formatDateTime(session.finished_at)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/history">
            <Button variant="secondary">返回列表</Button>
          </Link>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            总容量 {totalVolume.toLocaleString()} kg
          </span>
        </div>
      </div>

      {sets.length === 0 ? (
        <Empty title="这次训练没有记录" description="可能是直接开始又结束的空 session" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([exerciseId, list]) => (
            <Card
              key={exerciseId}
              title={list[0]?.exercise?.name ?? `动作 #${exerciseId}`}
              description={`${list.length} 组 · 容量 ${setVolume(list).toLocaleString()} kg`}
            >
              <div className="space-y-2">
                {list
                  .slice()
                  .sort((a, b) => a.set_index - b.set_index)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 px-3 py-2"
                    >
                      <div className="col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        第 {s.set_index} 组
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min={0}
                          defaultValue={s.reps ?? ''}
                          key={`reps-${s.id}-${s.reps}`}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== s.reps) {
                              updateMut.mutate({ id: s.id, input: { ...s, reps: v } });
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          defaultValue={s.weight ?? ''}
                          key={`weight-${s.id}-${s.weight}`}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== s.weight) {
                              updateMut.mutate({ id: s.id, input: { ...s, weight: v } });
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={(e) =>
                              updateMut.mutate({
                                id: s.id,
                                input: { ...s, completed: e.target.checked },
                              })
                            }
                          />
                          完成
                        </label>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMut.mutate(s.id)}
                          loading={removeMut.isPending}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
