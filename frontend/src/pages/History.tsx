import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionsApi } from '../api/sessions';
import { Button, Card, Empty, Loading } from '../components';
import { queryKeys } from '../lib/queryKeys'
import { formatDate, formatDateTime, setVolume } from '../lib/format';

export default function HistoryPage() {
  const sessionsQ = useQuery({
    queryKey: queryKeys.sessions.list({ limit: 100 }),
    queryFn: () => sessionsApi.list({ limit: 100 }),
  });

  if (sessionsQ.isLoading) return <Loading label="加载历史…" />;
  if (sessionsQ.error)
    return (
      <Empty
        title="无法加载历史"
        description={(sessionsQ.error as Error).message}
      />
    );

  const sessions = sessionsQ.data ?? [];

  return (
    <div className="space-y-4 md:space-y-6" data-testid="history-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">训练历史</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">按时间倒序展示</p>
      </div>

      {sessions.length === 0 ? (
        <Empty
          title="还没有训练记录"
          description="开始你的第一次训练"
          action={
            <Link to="/plans">
              <Button>去创建计划</Button>
            </Link>
          }
        />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {sessions
              .slice()
              .sort((a, b) => (b.started_at > a.started_at ? 1 : -1))
              .map((s) => {
                const totalVol =
                  s.total_volume ??
                  setVolume(
                    (s.sets ?? []).map((set) => ({
                      reps: set.reps,
                      weight: set.weight,
                      completed: set.completed,
                    })),
                  );
                return (
                  <li key={s.id}>
                    <Link
                      to={`/history/${s.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(s.session_date)} ·{' '}
                          {s.plan?.name ?? (s.plan_id ? `计划 #${s.plan_id}` : '自由训练')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(s.started_at)}
                          {s.finished_at
                            ? ` → ${formatDateTime(s.finished_at)}`
                            : ' · 进行中'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-brand-600">
                          {totalVol.toLocaleString()} kg
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">总容量</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}
    </div>
  );
}
