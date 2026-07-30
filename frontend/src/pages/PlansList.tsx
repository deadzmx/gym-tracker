import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { plansApi } from '../api/plans';
import {
  Button,
  Card,
  Empty,
  Loading,
  Modal,
  useToast,
} from '../components';
import { dayName, queryKeys } from '../lib/queryKeys';
import type { WorkoutPlan } from '../types';

export default function PlansListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<WorkoutPlan | null>(null);

  const plansQ = useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: plansApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => plansApi.remove(id),
    onSuccess: () => {
      toast.push('success', '计划已删除');
      qc.invalidateQueries({ queryKey: queryKeys.plans.all });
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.push('error', e.message ?? '删除失败'),
  });

  if (plansQ.isLoading) return <Loading label="加载计划…" />;
  if (plansQ.error) {
    return (
      <Empty
        title="加载计划失败"
        description={(plansQ.error as Error).message}
        action={
          <Button onClick={() => plansQ.refetch()}>重试</Button>
        }
      />
    );
  }

  const plans = plansQ.data ?? [];

  return (
    <div className="space-y-4 md:space-y-6" data-testid="plans-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">训练计划</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">管理你的训练模板</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/plans/recommend">
            <Button variant="secondary" className="w-full sm:w-auto">✨ AI 推荐</Button>
          </Link>
          <Link to="/plans/new">
            <Button className="w-full sm:w-auto">新建计划</Button>
          </Link>
        </div>
      </div>

      {plans.length === 0 ? (
        <Empty
          title="还没有计划"
          description="创建一个训练计划,比如推日 / 拉日 / 腿日,或者让 AI 帮你生成"
          action={
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/plans/recommend">
                <Button variant="secondary">✨ AI 推荐</Button>
              </Link>
              <Link to="/plans/new">
                <Button>新建计划</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 dark:text-slate-100">{p.name}</h3>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {dayName(p.day_of_week)}
                  </span>
                </div>
                {p.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                    {p.description}
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/plans/${p.id}`} className="flex-1 sm:flex-none">
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto">查看</Button>
                </Link>
                <Link to={`/plans/${p.id}/edit`} className="flex-1 sm:flex-none">
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto">编辑</Button>
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate(`/workout?plan_id=${p.id}`)}
                >
                  🔥 开始训练
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setPendingDelete(p)}
                >
                  删除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="删除计划?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={deleteMut.isPending}
            >
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteMut.isPending}
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete.id)}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          即将删除计划 <strong>{pendingDelete?.name}</strong>,此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}
