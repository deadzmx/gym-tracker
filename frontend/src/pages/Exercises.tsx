import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exercisesApi } from '../api/exercises';
import { Card, Empty, Input, Loading, Tabs } from '../components';
import { queryKeys } from '../lib/queryKeys';
import type { ExerciseCategory } from '../types';

const CATEGORY_TABS: Array<{ value: 'all' | ExerciseCategory; label: string; emoji: string }> = [
  { value: 'all',    label: '全部',  emoji: '🏋️' },
  { value: '胸',  label: '胸',   emoji: '💪' },
  { value: '背',  label: '背',   emoji: '🪢' },
  { value: '腿',  label: '腿',   emoji: '🦵' },
  { value: '肩',  label: '肩',   emoji: '🙆' },
  { value: '臂',  label: '臂',   emoji: '💪' },
  { value: '核心', label: '核心', emoji: '🧘' },
  { value: '有氧', label: '有氧', emoji: '🏃' },
];

const EQUIPMENT_EMOJI: Record<string, string> = {
  '杠铃': '🏋️',
  '哑铃': '🏋️',
  '器械': '🛋️',
  '绳索': '🪢',
  '徒手': '🤸',
};

export default function ExercisesPage() {
  const [category, setCategory] = useState<'all' | ExerciseCategory>('all');
  const [search, setSearch] = useState('');

  const exercisesQ = useQuery({
    queryKey: queryKeys.exercises.list({ category: category === 'all' ? undefined : category }),
    queryFn: () =>
      exercisesApi.list(category === 'all' ? {} : { category }),
  });

  const filtered = useMemo(() => {
    const all = exercisesQ.data ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.primary_muscle ?? '').toLowerCase().includes(q),
    );
  }, [exercisesQ.data, search]);

  return (
    <div className="space-y-4 md:space-y-6" data-testid="exercises-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">动作库</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">所有可用的训练动作</p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            items={CATEGORY_TABS.map((c) => ({ value: c.value, label: c.label }))}
            value={category}
            onChange={(v) => setCategory(v)}
          />
          <div className="w-full md:w-72">
            <Input
              placeholder="搜索动作名 / 肌群…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {exercisesQ.isLoading ? (
        <Loading label="加载动作…" />
      ) : filtered.length === 0 ? (
        <Empty
          title="没有匹配的动作"
          description="试试切换分类或调整搜索关键词"
        />
      ) : (
        <>
          {/* Desktop: table with emoji column */}
          <Card padded={false} className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-16">图示</th>
                    <th className="px-4 py-3">名称</th>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">器械</th>
                    <th className="px-4 py-3">主要肌群</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-2xl text-center">
                        {e.image_url ?? '🏋️'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{e.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {e.category}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {EQUIPMENT_EMOJI[e.equipment] ?? ''} {e.equipment}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.primary_muscle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: card list with image */}
          <div className="space-y-2 md:hidden">
            {filtered.map((e) => (
              <Card key={e.id} className="!p-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl shrink-0">{e.image_url ?? '🏋️'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{e.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {e.category} · {e.equipment}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{e.primary_muscle}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
