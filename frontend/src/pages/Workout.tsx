import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Empty, Input, Loading, useToast } from '../components';
import { plansApi } from '../api/plans';
import { sessionsApi, setsApi } from '../api/sessions';
import { queryKeys, todayIso } from '../lib/queryKeys';
import { isOnline, onConnectivityChange, queueSession, queueSet } from '../lib/offlineCache';
import { syncPending, getPendingSummary } from '../lib/syncQueue';
import type { ExerciseSetInput, PlanExercise } from '../types';

interface LoggedSet {
  tempId: string;
  exercise_id: number;
  plan_exercise_id: number | null;
  set_index: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
  dbId?: number;
}

function tempId(): string {
  return Math.random().toString(36).slice(2);
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WorkoutPage() {
  const [params] = useSearchParams();
  const planIdParam = params.get('plan_id');
  const planId = planIdParam ? Number(planIdParam) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null); // for offline queue
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restTarget, setRestTarget] = useState<number | null>(null);
  const [online, setOnline] = useState<boolean>(isOnline());
  const [pending, setPending] = useState<{ sessions: number; sets: number }>({ sessions: 0, sets: 0 });
  const [syncing, setSyncing] = useState(false);
  const restRef = useRef<number | null>(null);

  // Watch connectivity
  useEffect(() => {
    return onConnectivityChange((up) => {
      setOnline(up);
      if (up) {
        void doSync();
      }
    });
  }, []);

  // Load pending count
  const refreshPending = async () => {
    try {
      const p = await getPendingSummary();
      setPending(p);
    } catch {
      /* noop */
    }
  };
  useEffect(() => {
    void refreshPending();
  }, []);

  // Auto-sync function
  const doSync = async () => {
    if (!isOnline() || syncing) return;
    setSyncing(true);
    try {
      const res = await syncPending();
      if (res.sessionsCreated > 0 || res.setsSynced > 0) {
        toast.push('success', `已同步 ${res.sessionsCreated} 个 session, ${res.setsSynced} 组数据`);
        qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
        qc.invalidateQueries({ queryKey: ['stats'] });
      }
      if (res.errors.length) {
        toast.push('error', `同步失败: ${res.errors[0]}`);
      }
    } catch (err) {
      toast.push('error', `同步失败: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
      void refreshPending();
    }
  };

  const planQ = useQuery({
    queryKey: queryKeys.plans.detail(planId ?? -1),
    queryFn: () => plansApi.get(planId as number),
    enabled: planId !== null,
  });

  const startMut = useMutation({
    mutationFn: async () => {
      if (!isOnline()) {
        // Offline: queue locally
        const { localId } = await queueSession({
          plan_id: planId,
          session_date: todayIso(),
        });
        return { id: -1, localId };
      }
      const s = await sessionsApi.start({
        plan_id: planId,
        session_date: todayIso(),
      });
      return { id: s.id, localId: null as string | null };
    },
    onSuccess: (s) => {
      setSessionId(s.id > 0 ? s.id : null);
      setLocalSessionId(s.localId);
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
      void refreshPending();
      if (s.id <= 0) {
        toast.push('info', '离线模式,数据将保存到本地,联网后自动同步');
      }
    },
    onError: (e: Error) => toast.push('error', e.message ?? '开始训练失败'),
  });

  const addSetMut = useMutation({
    mutationFn: (sets: ExerciseSetInput[]) => {
      if (!sessionId) throw new Error('没有活动的 session');
      return setsApi.createBatch(sessionId, sets);
    },
    onSuccess: (saved) => {
      const idMap = new Map<number, number>();
      saved.forEach((s, i) => idMap.set(i, s.id));
      setLoggedSets((prev) => {
        const uncommitted = prev.filter((s) => !s.dbId);
        return prev.map((s) => {
          if (s.dbId) return s;
          const idx = uncommitted.indexOf(s);
          if (idx === -1) return s;
          const dbId = idMap.get(idx);
          return dbId ? { ...s, dbId } : s;
        });
      });
      qc.invalidateQueries({ queryKey: queryKeys.stats.summary() });
    },
    onError: (e: Error) => toast.push('error', e.message ?? '保存组数失败'),
  });

  const finishMut = useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error('没有活动的 session');
      return sessionsApi.patch(sessionId, {
        finished_at: new Date().toISOString(),
      });
    },
    onSuccess: (s) => {
      toast.push('success', '训练完成 🎉');
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
      qc.invalidateQueries({ queryKey: queryKeys.stats.summary() });
      navigate(`/history/${s.id}`);
    },
    onError: (e: Error) => toast.push('error', e.message ?? '结束训练失败'),
  });

  // Rest timer
  useEffect(() => {
    if (restRemaining === null) return;
    const id = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          toast.push('info', '休息结束,继续下一组!');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [restRemaining, toast]);

  const planExercises: PlanExercise[] = useMemo(() => {
    const raw = planQ.data?.plan_exercises ??
      (planQ.data as unknown as { exercises?: PlanExercise[] } | undefined)?.exercises;
    return raw ? [...raw].sort((a, b) => a.order_index - b.order_index) : [];
  }, [planQ.data]);

  const currentExercise = planExercises[activeExerciseIdx] ?? null;

  const setsForCurrent = useMemo(
    () => loggedSets.filter((s) => s.exercise_id === currentExercise?.exercise_id),
    [loggedSets, currentExercise],
  );

  const startRest = (seconds: number) => {
    setRestTarget(seconds);
    setRestRemaining(seconds);
    restRef.current = seconds;
  };
  const stopRest = () => {
    setRestRemaining(null);
    setRestTarget(null);
  };

  const addSetRow = () => {
    if (!currentExercise) return;
    const nextIndex = setsForCurrent.length + 1;
    setLoggedSets((prev) => [
      ...prev,
      {
        tempId: tempId(),
        exercise_id: currentExercise.exercise_id,
        plan_exercise_id: currentExercise.id,
        set_index: nextIndex,
        reps: currentExercise.target_reps,
        weight: currentExercise.target_weight ?? 0,
        rpe: null,
        completed: true,
      },
    ]);
  };

  const updateLocal = (tempIdVal: string, patch: Partial<LoggedSet>) => {
    setLoggedSets((prev) => prev.map((s) => (s.tempId === tempIdVal ? { ...s, ...patch } : s)));
  };

  const persistSet = (s: LoggedSet) => {
    if (s.dbId) {
      // Online: just update via API
      setsApi.update(s.dbId, {
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        completed: s.completed,
      }).then(() => {
        // silent success
      }).catch((e: Error) => toast.push('error', e.message));
      return;
    }
    if (!isOnline() || !sessionId) {
      // Offline: queue to IndexedDB
      if (!localSessionId && !sessionId) {
        toast.push('error', '还没开始训练,请先点"开始训练"');
        return;
      }
      void queueSet({
        sessionLocalId: sessionId ? String(sessionId) : (localSessionId as string),
        exercise_id: s.exercise_id,
        plan_exercise_id: s.plan_exercise_id,
        set_index: s.set_index,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        completed: s.completed,
      }).then(() => {
        void refreshPending();
      });
      return;
    }
    addSetMut.mutate([
      {
        exercise_id: s.exercise_id,
        plan_exercise_id: s.plan_exercise_id,
        set_index: s.set_index,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        completed: s.completed,
      },
    ]);
  };

  const removeSet = (s: LoggedSet) => {
    if (s.dbId) {
      setsApi.remove(s.dbId).catch((e: Error) => toast.push('error', e.message));
    }
    setLoggedSets((prev) => prev.filter((x) => x.tempId !== s.tempId));
  };

  // Auto-start session if plan provided and not yet started
  useEffect(() => {
    if (planId && !sessionId && !localSessionId && !startMut.isPending && !startMut.data) {
      startMut.mutate();
    }
  }, [planId, sessionId, localSessionId, startMut]);

  if (planId === null) {
    return (
      <div className="space-y-4 md:space-y-6" data-testid="workout-page">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">自由训练</h1>
        <Empty
          title="自由训练功能"
          description="从计划详情页点'开始训练'会带入动作;这里可以做无模板的快速记录"
        />
      </div>
    );
  }

  if (planQ.isLoading) return <Loading label="加载计划…" />;
  if (planQ.error)
    return (
      <Empty
        title="无法加载计划"
        description={(planQ.error as Error).message}
        action={
          <Button onClick={() => planQ.refetch()}>重试</Button>
        }
      />
    );
  if (!planQ.data) return <Empty title="计划不存在" />;

  return (
    <div className="space-y-4 md:space-y-6" data-testid="workout-page">
      {/* Status bar: online/offline + pending count + sync button */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
          online
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
        }`}
        data-testid="connectivity-status"
      >
        <div className="flex items-center gap-2">
          <span>{online ? '🟢 在线' : '🟡 离线'}</span>
          {pending.sessions > 0 || pending.sets > 0 ? (
            <span>
              · 待同步: {pending.sessions} 个 session, {pending.sets} 组
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {pending.sessions > 0 || pending.sets > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void doSync()}
              loading={syncing}
              disabled={!online || syncing}
              data-testid="sync-btn"
            >
              {syncing ? '同步中…' : '立即同步'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{planQ.data.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {sessionId ? `Session #${sessionId}` : localSessionId ? '本地未同步 session' : '准备开始'} · 共 {planExercises.length} 个动作
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const pending = loggedSets.filter((s) => !s.dbId);
              if (!pending.length) {
                toast.push('info', '没有需要保存的草稿');
                return;
              }
              if (!isOnline() || !sessionId) {
                // Queue to local
                Promise.all(pending.map((s) => queueSet({
                  sessionLocalId: sessionId ? String(sessionId) : (localSessionId as string),
                  exercise_id: s.exercise_id,
                  plan_exercise_id: s.plan_exercise_id,
                  set_index: s.set_index,
                  reps: s.reps,
                  weight: s.weight,
                  rpe: s.rpe,
                  completed: s.completed,
                }))).then(() => {
                  void refreshPending();
                  toast.push('success', `已保存 ${pending.length} 组到本地`);
                });
                return;
              }
              addSetMut.mutate(
                pending.map((s) => ({
                  exercise_id: s.exercise_id,
                  plan_exercise_id: s.plan_exercise_id,
                  set_index: s.set_index,
                  reps: s.reps,
                  weight: s.weight,
                  rpe: s.rpe,
                  completed: s.completed,
                })),
              );
            }}
            loading={addSetMut.isPending}
            disabled={!sessionId && !localSessionId}
          >
            保存草稿
          </Button>
          <Button
            variant="danger"
            onClick={() => finishMut.mutate()}
            loading={finishMut.isPending}
            disabled={!sessionId}
          >
            结束训练
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
        <Card title="动作" padded={false}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {planExercises.map((pe, idx) => {
              const count = loggedSets.filter(
                (s) => s.exercise_id === pe.exercise_id && s.dbId,
              ).length;
              return (
                <li key={pe.id}>
                  <button
                    type="button"
                    onClick={() => setActiveExerciseIdx(idx)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      idx === activeExerciseIdx
                        ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {idx + 1}. {pe.exercise?.name ?? `#${pe.exercise_id}`}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {count}/{pe.target_sets}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      目标 {pe.target_sets} × {pe.target_reps}
                      {pe.target_weight != null ? ` @ ${pe.target_weight}kg` : ''}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          {currentExercise ? (
            <>
              <Card
                title={`${currentExercise.exercise?.name ?? `动作 #${currentExercise.exercise_id}`}`}
                description={`目标 ${currentExercise.target_sets} 组 × ${currentExercise.target_reps} 次,休息 ${currentExercise.rest_seconds}s`}
                actions={
                  restRemaining !== null ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                        休息 {formatClock(restRemaining)} / {formatClock(restTarget ?? 0)}
                      </span>
                      <Button size="sm" variant="secondary" onClick={stopRest}>
                        跳过
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startRest(currentExercise.rest_seconds)}
                    >
                      开始休息计时
                    </Button>
                  )
                }
              >
                <div className="space-y-2">
                  {setsForCurrent.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">还没有记录,点下方大按钮添加第一组。</p>
                  ) : (
                    setsForCurrent.map((s) => (
                      <div
                        key={s.tempId}
                        className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800"
                      >
                        <div className="col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          第 {s.set_index} 组
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min={0}
                            value={s.reps}
                            onChange={(e) =>
                              updateLocal(s.tempId, { reps: Number(e.target.value) })
                            }
                            onBlur={() => persistSet(s)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={s.weight}
                            onChange={(e) =>
                              updateLocal(s.tempId, { weight: Number(e.target.value) })
                            }
                            onBlur={() => persistSet(s)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={s.completed}
                              onChange={(e) => {
                                updateLocal(s.tempId, { completed: e.target.checked });
                                persistSet({ ...s, completed: e.target.checked });
                              }}
                            />
                            完成
                          </label>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSet(s)}
                            aria-label="删除组"
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Big touch buttons for mobile */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={addSetRow}
                    className="w-full sm:w-auto"
                    data-testid="add-set-btn"
                  >
                    ➕ 加一组
                  </Button>
                  {currentExercise.rest_seconds > 0 ? (
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => startRest(currentExercise.rest_seconds)}
                      className="w-full sm:w-auto"
                      data-testid="rest-btn"
                    >
                      ⏱ 休息 {currentExercise.rest_seconds}s
                    </Button>
                  ) : null}
                </div>
              </Card>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="secondary"
                  disabled={activeExerciseIdx === 0}
                  onClick={() => setActiveExerciseIdx((i) => Math.max(0, i - 1))}
                  className="w-full sm:w-auto"
                >
                  ← 上一个动作
                </Button>
                <Button
                  disabled={activeExerciseIdx >= planExercises.length - 1}
                  onClick={() =>
                    setActiveExerciseIdx((i) => Math.min(planExercises.length - 1, i + 1))
                  }
                  className="w-full sm:w-auto"
                >
                  下一个动作 →
                </Button>
              </div>
            </>
          ) : (
            <Empty title="这个计划没有动作" description="先去编辑计划添加动作" />
          )}
        </div>
      </div>
    </div>
  );
}
