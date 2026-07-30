import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../api/sessions';
import { Button, Card, Empty, Loading, MonthCalendar, useToast } from '../components';
import type { MonthSession } from '../components';
import { addMonth, buildMonth, groupSessionsByDate, monthKey } from '../lib/calendar';
import { queryKeys } from '../lib/queryKeys';
import type { WorkoutSession } from '../types';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);

  const monthInfo = useMemo(() => buildMonth(year, month), [year, month]);

  // Fetch sessions for this month (whole grid range, with padding weeks)
  const firstDate = monthInfo.weeks[0][0].date;
  const lastDate = monthInfo.weeks[monthInfo.weeks.length - 1][6].date;
  const sessionsQ = useQuery({
    queryKey: queryKeys.sessions.list({ from: firstDate, to: lastDate, limit: 500 }),
    queryFn: () => sessionsApi.list({ from: firstDate, to: lastDate, limit: 500 }),
  });

  // Reshape to MonthSession shape (for compatibility with MonthCalendar)
  const monthSessions: MonthSession[] = useMemo(() => {
    return (sessionsQ.data ?? []).map((s: WorkoutSession) => ({
      id: s.id,
      session_date: s.session_date,
      plan_id: s.plan_id,
      plan: s.plan ? { name: s.plan.name } : null,
      total_volume: s.total_volume,
      total_sets: s.sets?.length ?? 0,
      notes: s.notes,
    }));
  }, [sessionsQ.data]);

  const moveMut = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) =>
      sessionsApi.patch(id, { session_date: date }),
    onSuccess: (_, vars) => {
      toast.push('success', `已移到 ${vars.date}`);
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
      qc.invalidateQueries({ queryKey: ['stats', 'calendar'] });
    },
    onError: (e: Error) => {
      toast.push('error', e.message ?? '移动失败');
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });

  const handleMove = (sessionId: number, _fromDate: string, toDate: string) => {
    moveMut.mutate({ id: sessionId, date: toDate });
    // Optimistic update — adjust local cache to reflect new date immediately
    qc.setQueryData<WorkoutSession[]>(
      queryKeys.sessions.list({ from: firstDate, to: lastDate, limit: 500 }),
      (old) =>
        (old ?? []).map((s) =>
          s.id === sessionId ? { ...s, session_date: toDate } : s,
        ),
    );
  };

  const handleSessionClick = (s: MonthSession) => {
    navigate(`/history/${s.id}`);
  };

  const goPrev = () => {
    const next = addMonth(year, month, -1);
    setYear(next.year);
    setMonth(next.month);
  };
  const goNext = () => {
    const next = addMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getUTCMonth() + 1);
  };

  const totalInMonth = monthSessions.filter((s) => {
    return s.session_date >= monthInfo.firstDate && s.session_date <= monthInfo.lastDate;
  }).length;

  const sessionsByDate = useMemo(() => groupSessionsByDate(monthSessions), [monthSessions]);
  void sessionsByDate; // currently used inside MonthCalendar; keep reference for future expansion
  return (
    <div className="space-y-4 md:space-y-6" data-testid="calendar-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">📅 训练日历</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            拖动 session 到其他日期来调整训练时间
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={goPrev} aria-label="上个月" data-testid="prev-month">
            ←
          </Button>
          <span className="min-w-[110px] px-3 text-center text-sm font-semibold" data-testid="month-label">
            {monthInfo.monthLabel}
          </span>
          <Button variant="ghost" size="sm" onClick={goNext} aria-label="下个月" data-testid="next-month">
            →
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday} data-testid="today-btn">
            今天
          </Button>
        </div>
      </div>

      <Card padded={false} className="overflow-hidden">
        {sessionsQ.isLoading ? (
          <div className="p-6"><Loading label="加载日历…" /></div>
        ) : sessionsQ.error ? (
          <Empty
            title="加载失败"
            description={(sessionsQ.error as Error).message}
            action={<Button onClick={() => sessionsQ.refetch()}>重试</Button>}
          />
        ) : (
          <MonthCalendar
            month={monthInfo}
            sessions={monthSessions}
            onMoveSession={handleMove}
            onSessionClick={handleSessionClick}
          />
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>📊 {monthInfo.monthLabel} 共 <strong className="text-slate-900 dark:text-slate-100">{totalInMonth}</strong> 次训练</span>
        <span>·</span>
        <span>💡 长按 session 卡片拖到其他日期</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        {WEEKDAY_NAMES.map((d) => (
          <span key={d} className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            {d}
          </span>
        ))}
      </div>

      <div className="text-xs text-slate-400 dark:text-slate-500">
        <span>月视图 key: {monthKey(year, month)}</span>
        {moveMut.isPending ? <span> · 正在保存移动…</span> : null}
      </div>
    </div>
  );
}
