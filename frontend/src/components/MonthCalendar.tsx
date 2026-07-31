// Month calendar with drag-and-drop session cards.
// - 7×6 grid, each cell is a drop target
// - Session "pills" inside each day are draggable
// - On drop: calls onMoveSession(sessionId, newDate)
// - Pure presentation — state, fetching, mutation live in the parent page

import { useMemo, useState, type CSSProperties } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import clsx from 'clsx';
import type { CalendarCell, CalendarMonth } from '../lib/calendar';

export interface MonthSession {
  id: number;
  session_date: string;
  plan_id: number | null;
  plan?: { name: string } | null;
  total_volume?: number;
  total_sets?: number;
  notes?: string | null;
}

export interface MonthCalendarProps {
  month: CalendarMonth;
  sessions: MonthSession[];
  onMoveSession: (sessionId: number, fromDate: string, toDate: string) => void;
  onSessionClick?: (session: MonthSession) => void;
  className?: string;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function SessionPill({
  session,
  onClick,
  isOverlay,
}: {
  session: MonthSession;
  onClick?: (s: MonthSession) => void;
  isOverlay?: boolean;
}) {
  const label = session.plan?.name ?? '自由训练';
  const sets = session.total_sets ?? 0;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(session);
      }}
      data-testid={`session-pill-${session.id}`}
      className={clsx(
        'block w-full truncate rounded-md px-2 py-1 text-left text-xs font-medium shadow-sm transition-shadow',
        'bg-brand-100 text-brand-800 hover:bg-brand-200 hover:shadow',
        'dark:bg-brand-900/60 dark:text-brand-100 dark:hover:bg-brand-800',
        isOverlay && 'rotate-2 shadow-lg cursor-grabbing',
      )}
      title={`${label} · ${sets} 组${session.total_volume ? ` · ${session.total_volume}kg` : ''}`}
    >
      <span className="mr-1">💪</span>
      {label}
      {sets > 0 ? <span className="ml-1 text-[10px] text-brand-600 dark:text-brand-300">· {sets}</span> : null}
    </button>
  );
}

function DraggablePill({
  session,
  onClick,
}: {
  session: MonthSession;
  onClick?: (s: MonthSession) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `session-${session.id}`,
    data: { sessionId: session.id, fromDate: session.session_date },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'none' }}
      className={clsx(isDragging && 'opacity-30')}
    >
      <SessionPill session={session} onClick={onClick} />
    </div>
  );
}

function DroppableDay({
  cell,
  sessions,
  onSessionClick,
}: {
  cell: CalendarCell;
  sessions: MonthSession[];
  onSessionClick?: MonthCalendarProps['onSessionClick'];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${cell.date}`,
    data: { date: cell.date },
  });
  const active = isOver;
  return (
    <div
      ref={setNodeRef}
      data-testid={`day-cell-${cell.date}`}
      data-date={cell.date}
      className={clsx(
        'flex min-h-[80px] md:min-h-[110px] flex-col gap-1 border border-slate-100 p-1.5 transition-colors md:p-2 dark:border-slate-800',
        !cell.inMonth && 'bg-slate-50 text-slate-400 dark:bg-slate-900/50 dark:text-slate-600',
        cell.inMonth && 'bg-white dark:bg-slate-950',
        cell.isToday && 'ring-2 ring-brand-500 ring-inset',
        cell.isWeekend && cell.inMonth && 'bg-slate-50/50 dark:bg-slate-900/30',
        active && 'bg-brand-50 ring-2 ring-brand-400 dark:bg-brand-900/30',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
            cell.isToday && 'bg-brand-600 text-white',
            !cell.isToday && cell.inMonth && 'text-slate-700 dark:text-slate-300',
          )}
        >
          {cell.day}
        </span>
        {sessions.length > 0 ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            {sessions.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">
        {sessions.slice(0, 3).map((s) => (
          <DraggablePill key={s.id} session={s} onClick={onSessionClick} />
        ))}
        {sessions.length > 3 ? (
          <div className="text-[10px] text-slate-500 dark:text-slate-400">+{sessions.length - 3} more</div>
        ) : null}
      </div>
    </div>
  );
}

export function MonthCalendar({
  month,
  sessions,
  onMoveSession,
  onSessionClick,
  className,
}: MonthCalendarProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, MonthSession[]>();
    for (const s of sessions) {
      const arr = map.get(s.session_date) ?? [];
      arr.push(s);
      map.set(s.session_date, arr);
    }
    return map;
  }, [sessions]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = Number(e.active.id.toString().replace(/^session-/, ''));
    setDraggingId(id);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over) return;
    const overDate = e.over.data.current?.date as string | undefined;
    const fromDate = e.active.data.current?.fromDate as string | undefined;
    const sessionId = e.active.data.current?.sessionId as number | undefined;
    if (!overDate || !fromDate || !sessionId) return;
    if (overDate === fromDate) return; // no-op
    onMoveSession(sessionId, fromDate, overDate);
  };

  const draggingSession = draggingId != null
    ? sessions.find((s) => s.id === draggingId)
    : null;

  return (
    <div className={className} data-testid="month-calendar">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={clsx(
              'py-2 text-center text-xs font-semibold',
              (i === 0 || i === 6) ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <div
          className="grid grid-cols-7"
          style={{ '--cell-count': 6 } as CSSProperties}
        >
          {month.weeks.flat().map((cell) => {
            const daySessions = sessionsByDate.get(cell.date) ?? [];
            return (
              <DroppableDay
                key={cell.date}
                cell={cell}
                sessions={daySessions}
                onSessionClick={onSessionClick}
              />
            );
          })}
        </div>
        <DragOverlay>
          {draggingSession ? (
            <div className="w-44">
              <SessionPill session={draggingSession} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
// (useDraggableState was removed; useState<number | null>(null) inline)
