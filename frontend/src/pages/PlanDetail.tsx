import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { plansApi } from '../api/plans';
import { Button, Card, Empty, Loading } from '../components';
import { dayName, formatDate, queryKeys } from '../lib/queryKeys';

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const planId = Number(id);

  const planQ = useQuery({
    queryKey: queryKeys.plans.detail(planId),
    queryFn: () => plansApi.get(planId),
    enabled: !Number.isNaN(planId),
  });

  if (planQ.isLoading) return <Loading label="加载计划…" />;
  if (planQ.error) {
    return (
      <Empty
        title="无法加载计划"
        description={(planQ.error as Error).message}
        action={
          <Button onClick={() => planQ.refetch()}>重试</Button>
        }
      />
    );
  }
  const plan = planQ.data;
  if (!plan) return <Empty title="计划不存在" />;
  const planExercises = plan.plan_exercises ?? (plan as unknown as { exercises?: typeof plan.plan_exercises }).exercises ?? [];

  return (
    <div className="space-y-6" data-testid="plan-detail-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">{plan.name}</h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {dayName(plan.day_of_week)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            创建于 {formatDate(plan.created_at)} · {planExercises.length} 个动作
          </p>
          {plan.description ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/plans">
            <Button variant="secondary">返回</Button>
          </Link>
          <Link to={`/plans/${plan.id}/edit`}>
            <Button variant="secondary">编辑</Button>
          </Link>
          <Button onClick={() => navigate(`/workout?plan_id=${plan.id}`)}>
            开始训练
          </Button>
        </div>
      </div>

      {(planExercises ?? []).length === 0 ? (
        <Empty
          title="这个计划还没有动作"
          description="点编辑按钮添加动作"
          action={
            <Link to={`/plans/${plan.id}/edit`}>
              <Button>去编辑</Button>
            </Link>
          }
        />
      ) : (
        <Card title="动作清单">
          <ol className="divide-y divide-slate-100">
            {planExercises
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((pe) => (
                <li key={pe.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100 dark:text-slate-100">
                      {pe.order_index + 1}. {pe.exercise?.name ?? `动作 #${pe.exercise_id}`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {pe.target_sets} 组 × {pe.target_reps} 次
                      {pe.target_weight != null ? ` · ${pe.target_weight} kg` : ''}
                      {` · 休息 ${pe.rest_seconds}s`}
                    </p>
                  </div>
                </li>
              ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
