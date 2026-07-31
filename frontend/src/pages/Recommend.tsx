import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recommendApi } from '../api/recommend';
import { plansApi } from '../api/plans';
import { exercisesApi } from '../api/exercises';
import { Button, Card, Input, Loading, Select, useToast } from '../components';
import { dayName, queryKeys } from '../lib/queryKeys';
import { loadSettings } from '../lib/settings';
import type {
  Equipment,
  Experience,
  ExerciseCategory,
  Goal,
  RecommendInput,
  RecommendOutput,
} from '../types';
import { useQueryClient } from '@tanstack/react-query';

const GOALS: Array<{ value: Goal; label: string; desc: string }> = [
  { value: 'muscle', label: '💪 增肌', desc: '提高肌肉量,中高容量训练' },
  { value: 'fat_loss', label: '🔥 减脂', desc: '保持肌肉,中高次数低休息' },
  { value: 'strength', label: '🏋️ 力量', desc: '最大力量,低次数高重量' },
  { value: 'balanced', label: '⚖️ 综合', desc: '体能 + 肌力平衡发展' },
];

const EXPERIENCES: Array<{ value: Experience; label: string }> = [
  { value: 'beginner', label: '初学者(< 6 个月)' },
  { value: 'intermediate', label: '中级(6 月 - 3 年)' },
  { value: 'advanced', label: '高级(> 3 年)' },
];

const DAYS: Array<{ value: 3 | 4 | 5 | 6; label: string }> = [
  { value: 3, label: '3 天' },
  { value: 4, label: '4 天' },
  { value: 5, label: '5 天' },
  { value: 6, label: '6 天' },
];

const DURATIONS: Array<{ value: 30 | 45 | 60 | 75 | 90; label: string }> = [
  { value: 30, label: '30 分钟' },
  { value: 45, label: '45 分钟' },
  { value: 60, label: '60 分钟' },
  { value: 75, label: '75 分钟' },
  { value: 90, label: '90 分钟' },
];

const EQUIPMENT_OPTIONS: Array<{ value: Equipment; label: string }> = [
  { value: '杠铃', label: '杠铃' },
  { value: '哑铃', label: '哑铃' },
  { value: '器械', label: '固定器械' },
  { value: '绳索', label: '绳索' },
  { value: '徒手', label: '徒手' },
];

const CATEGORY_OPTIONS: Array<{ value: ExerciseCategory; label: string }> = [
  { value: '胸', label: '胸' },
  { value: '背', label: '背' },
  { value: '腿', label: '腿' },
  { value: '肩', label: '肩' },
  { value: '臂', label: '臂' },
  { value: '核心', label: '核心' },
  { value: '有氧', label: '有氧' },
];

export default function RecommendPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [goal, setGoal] = useState<Goal>('muscle');
  const [experience, setExperience] = useState<Experience>('intermediate');
  const [days, setDays] = useState<3 | 4 | 5 | 6>(4);
  const [duration, setDuration] = useState<30 | 45 | 60 | 75 | 90>(60);
  const [equipment, setEquipment] = useState<Equipment[]>(['杠铃', '哑铃', '器械']);
  const [focusAreas, setFocusAreas] = useState<ExerciseCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<RecommendOutput | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Load exercises for displaying names in the result
  const allExercisesQ = useQuery({
    queryKey: ['all-exercises'],
    queryFn: () => exercisesApi.list(),
  });
  const exerciseNameMap = useMemo(() => {
    const m = new Map<number, string>();
    (allExercisesQ.data ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [allExercisesQ.data]);

  const settings = useMemo(() => loadSettings(), []);
  const hasLlm = !!settings.llm?.api_key;

  const generateMut = useMutation({
    mutationFn: () => {
      const input: RecommendInput = {
        goal,
        experience,
        days_per_week: days,
        available_equipment: equipment,
        session_duration_min: duration,
        focus_areas: focusAreas.length > 0 ? focusAreas : undefined,
        notes: notes.trim() || undefined,
        llm: settings.llm ?? undefined,
      };
      return recommendApi.generate(input);
    },
    onSuccess: (res) => {
      setResult(res.data);
      setDegraded(res.degraded);
      setWarning(res.warning);
      if (res.degraded && res.warning === 'no_llm_key') {
        toast.push('info', '无 API key,使用规则引擎生成');
      } else if (res.degraded) {
        toast.push('info', `LLM 不可用,已用规则引擎:${res.warning ?? ''}`);
      } else {
        toast.push('success', 'LLM 生成完成');
      }
    },
    onError: (e: Error) => {
      toast.push('error', e.message ?? '生成失败');
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('没有可保存的计划');
      // Save as a single plan with day 0 (sunday) — could be split, but we'll do single plan
      // Save each day as a separate plan if multiple days
      const savedIds: number[] = [];
      for (const day of result.days) {
        const plan = await plansApi.create({
          name: `${result.name} - ${day.name}`,
          description: result.description,
          day_of_week: day.day_of_week,
          exercises: day.exercises.map((e) => ({
            exercise_id: e.exercise_id,
            order_index: e.order_index,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            target_weight: e.target_weight,
            rest_seconds: e.rest_seconds,
          })),
        } as any);
        savedIds.push(plan.id);
      }
      return savedIds;
    },
    onSuccess: (ids) => {
      toast.push('success', `已保存 ${ids.length} 个计划到训练计划列表`);
      qc.invalidateQueries({ queryKey: queryKeys.plans.all });
      navigate('/plans');
    },
    onError: (e: Error) => {
      toast.push('error', e.message ?? '保存失败');
    },
  });

  const toggleEquipment = (e: Equipment) => {
    setEquipment((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  };
  const toggleFocus = (c: ExerciseCategory) => {
    setFocusAreas((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  return (
    <div className="space-y-4 md:space-y-6" data-testid="recommend-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">✨ AI 推荐训练计划</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          填几个关键问题,生成一个完整的周训练计划
        </p>
      </div>

      <Card>
        <div className="space-y-5">
          {/* Goal */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              🎯 训练目标
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  data-testid={`goal-${g.value}`}
                  className={
                    goal === g.value
                      ? 'rounded-lg border-2 border-brand-500 bg-brand-50 p-3 text-left'
                      : 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left hover:border-slate-300'
                  }
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100 dark:text-slate-100">{g.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Experience + Days + Duration */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">📊 经验</label>
              <Select
                value={experience}
                onChange={(e) => setExperience(e.target.value as Experience)}
                options={EXPERIENCES.map((e) => ({ value: e.value, label: e.label }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">📅 每周天数</label>
              <Select
                value={String(days)}
                onChange={(e) => setDays(Number(e.target.value) as 3 | 4 | 5 | 6)}
                options={DAYS.map((d) => ({ value: String(d.value), label: d.label }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">⏱ 单次时长</label>
              <Select
                value={String(duration)}
                onChange={(e) => setDuration(Number(e.target.value) as 30 | 45 | 60 | 75 | 90)}
                options={DURATIONS.map((d) => ({ value: String(d.value), label: d.label }))}
              />
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              🏋️ 可用器械(可多选)
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => toggleEquipment(e.value)}
                  data-testid={`equipment-${e.value}`}
                  className={
                    equipment.includes(e.value)
                      ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                      : 'rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus areas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              💡 重点部位(可选,空表示均衡)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleFocus(c.value)}
                  className={
                    focusAreas.includes(c.value)
                      ? 'rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white'
                      : 'rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              📝 备注(可选)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="比如:膝盖旧伤,想避开深蹲;想练引体向上..."
              maxLength={500}
            />
          </div>

          {/* LLM status indicator */}
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            {hasLlm ? (
              <p className="text-emerald-700">
                ✅ 已检测到 LLM 设置 (provider: {settings.llm?.provider}),会用 AI 生成 + 自然语言解释
              </p>
            ) : (
              <p className="text-amber-700">
                ⚠️ 未配置 LLM key,将使用内置规则引擎生成。去{' '}
                <a href="/settings" className="font-medium underline">
                  设置页
                </a>{' '}
                填 key 升级到 AI 模式。
              </p>
            )}
          </div>

          <Button
            onClick={() => generateMut.mutate()}
            loading={generateMut.isPending}
            disabled={equipment.length === 0}
            data-testid="generate-btn"
            className="w-full sm:w-auto"
          >
            ✨ 生成训练计划
          </Button>
        </div>
      </Card>

      {/* Result */}
      {generateMut.isPending && <Loading label="生成中,可能需要几秒..." />}

      {result && (
        <Card
          title={result.name}
          description={result.description}
          data-testid="recommend-result"
        >
          <div className="space-y-4">
            {degraded && (
              <div
                className={
                  warning === 'no_llm_key'
                    ? 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'
                    : 'rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800'
                }
                data-testid="degraded-warning"
              >
                <p className="font-semibold">
                  {warning === 'no_llm_key' ? '使用规则引擎生成' : 'LLM 不可用,已自动回退'}
                </p>
                <p className="mt-1 text-xs">
                  {warning === 'no_llm_key'
                    ? '没检测到 LLM 设置,使用内置规则引擎。去"设置"页填 key 升级到 AI 模式。'
                    : 'LLM 调用失败(网络/认证/超时),已用规则引擎。检查 key 后重试。'}
                </p>
              </div>
            )}

            {!degraded && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-semibold">
                  ✨ AI 生成 ({result.source === 'llm' ? result.provider?.toUpperCase() : 'LLM'})
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">📋 计划概览</h3>
              <div className="space-y-3">
                {result.days.map((day, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                    data-testid={`day-${idx}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 dark:text-slate-100">{day.name}</h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                        {dayName(day.day_of_week)}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {day.exercises.map((ex) => (
                        <li
                          key={ex.exercise_id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-700 dark:text-slate-300 truncate">
                            • {exerciseNameMap.get(ex.exercise_id) ?? `动作 #${ex.exercise_id}`}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                            {ex.target_sets}×{ex.target_reps} · 休息 {ex.rest_seconds}s
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">💡 生成理由</h3>
              <p
                className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
                data-testid="rationale"
              >
                {result.rationale}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => saveMut.mutate()}
                loading={saveMut.isPending}
                data-testid="save-plan-btn"
                className="w-full sm:w-auto"
              >
                💾 保存到训练计划
              </Button>
              <Button
                variant="secondary"
                onClick={() => generateMut.mutate()}
                disabled={generateMut.isPending}
                className="w-full sm:w-auto"
              >
                🔄 重新生成
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
