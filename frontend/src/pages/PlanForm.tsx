import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { plansApi } from '../api/plans';
import { exercisesApi } from '../api/exercises';
import {
  Button,
  Card,
  Input,
  Loading,
  Select,
  Textarea,
  useToast,
} from '../components';
import { queryKeys } from '../lib/queryKeys'
import { dayName } from '../lib/format';
import type { PlanExerciseInput, WorkoutPlanInput } from '../types';

interface Row {
  key: string;
  exercise_id: string;
  target_sets: string;
  target_reps: string;
  target_weight: string;
  rest_seconds: string;
}

const DAY_OPTIONS = [
  { value: '', label: '任意日' },
  { value: '0', label: '周日' },
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
];

function newRow(): Row {
  return {
    key: Math.random().toString(36).slice(2),
    exercise_id: '',
    target_sets: '3',
    target_reps: '10',
    target_weight: '',
    rest_seconds: '60',
  };
}

export default function PlanFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const exercisesQ = useQuery({
    queryKey: queryKeys.exercises.list({}),
    queryFn: () => exercisesApi.list({}),
  });

  const detailQ = useQuery({
    queryKey: queryKeys.plans.detail(Number(id)),
    queryFn: () => plansApi.get(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!detailQ.data) return;
    setName(detailQ.data.name);
    setDescription(detailQ.data.description ?? '');
    setDayOfWeek(detailQ.data.day_of_week === null ? '' : String(detailQ.data.day_of_week));
    const planExercises = detailQ.data.plan_exercises ??
      (detailQ.data as unknown as { exercises?: typeof detailQ.data.plan_exercises }).exercises;
    if (planExercises && planExercises.length > 0) {
      setRows(
        planExercises.map((pe) => ({
          key: `init-${pe.id}`,
          exercise_id: String(pe.exercise_id),
          target_sets: String(pe.target_sets),
          target_reps: String(pe.target_reps),
          target_weight: pe.target_weight === null ? '' : String(pe.target_weight),
          rest_seconds: String(pe.rest_seconds),
        })),
      );
    }
  }, [detailQ.data]);

  const saveMut = useMutation({
    mutationFn: (input: WorkoutPlanInput) => {
      if (isEdit) {
        return plansApi.update(Number(id), input);
      }
      return plansApi.create(input);
    },
    onSuccess: (plan) => {
      toast.push('success', isEdit ? '计划已更新' : '计划已创建');
      qc.invalidateQueries({ queryKey: queryKeys.plans.all });
      navigate(`/plans/${plan.id}`);
    },
    onError: (e: Error) => toast.push('error', e.message ?? '保存失败'),
  });

  if (exercisesQ.isLoading || (isEdit && detailQ.isLoading)) {
    return <Loading label="加载表单数据…" />;
  }

  const exerciseOptions = (exercisesQ.data ?? []).map((e) => ({
    value: String(e.id),
    label: e.name,
  }));

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };
  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '请输入计划名';
    if (rows.length === 0) errs.rows = '至少添加一个动作';
    rows.forEach((r, i) => {
      if (!r.exercise_id) errs[`row_${i}_exercise`] = '请选择动作';
      if (!r.target_sets || Number(r.target_sets) <= 0) errs[`row_${i}_sets`] = '组数必须 > 0';
      if (!r.target_reps || Number(r.target_reps) <= 0) errs[`row_${i}_reps`] = '次数必须 > 0';
    });
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const exercises: PlanExerciseInput[] = rows.map((r, i) => ({
      exercise_id: Number(r.exercise_id),
      order_index: i,
      target_sets: Number(r.target_sets),
      target_reps: Number(r.target_reps),
      target_weight: r.target_weight === '' ? null : Number(r.target_weight),
      rest_seconds: Number(r.rest_seconds) || 0,
    }));
    const payload: WorkoutPlanInput = {
      name: name.trim(),
      description: description.trim() || null,
      day_of_week: dayOfWeek === '' ? null : Number(dayOfWeek),
      exercises,
    };
    saveMut.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="plan-form-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isEdit ? '编辑计划' : '新建计划'}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            取消
          </Button>
          <Button type="submit" loading={saveMut.isPending}>
            保存
          </Button>
        </div>
      </div>

      <Card title="基本信息">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="计划名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="比如:推日"
            required
          />
          <Select
            label="星期"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            options={DAY_OPTIONS}
          />
          <div className="md:col-span-2">
            <Textarea
              label="描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="胸+三头+肩"
            />
          </div>
        </div>
      </Card>

      <Card
        title="动作列表"
        description={`计划日:${dayName(dayOfWeek === '' ? null : Number(dayOfWeek))}`}
        actions={
          <Button type="button" size="sm" onClick={addRow}>
            + 添加动作
          </Button>
        }
      >
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row.key}
              className="grid grid-cols-12 gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 p-3"
            >
              <div className="col-span-12 md:col-span-4">
                <Select
                  label={idx === 0 ? '动作' : undefined}
                  value={row.exercise_id}
                  onChange={(e) => updateRow(idx, { exercise_id: e.target.value })}
                  options={exerciseOptions}
                  placeholder="选择动作"
                  error={errors[`row_${idx}_exercise`]}
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <Input
                  label={idx === 0 ? '组数' : undefined}
                  type="number"
                  min={1}
                  value={row.target_sets}
                  onChange={(e) => updateRow(idx, { target_sets: e.target.value })}
                  error={errors[`row_${idx}_sets`]}
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <Input
                  label={idx === 0 ? '次数' : undefined}
                  type="number"
                  min={1}
                  value={row.target_reps}
                  onChange={(e) => updateRow(idx, { target_reps: e.target.value })}
                  error={errors[`row_${idx}_reps`]}
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <Input
                  label={idx === 0 ? '重量(kg)' : undefined}
                  type="number"
                  min={0}
                  step="0.5"
                  value={row.target_weight}
                  onChange={(e) => updateRow(idx, { target_weight: e.target.value })}
                />
              </div>
              <div className="col-span-5 md:col-span-1">
                <Input
                  label={idx === 0 ? '休息(秒)' : undefined}
                  type="number"
                  min={0}
                  value={row.rest_seconds}
                  onChange={(e) => updateRow(idx, { rest_seconds: e.target.value })}
                />
              </div>
              <div className="col-span-1 flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(idx)}
                  aria-label="删除行"
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
          {errors.rows ? <p className="text-xs text-rose-600">{errors.rows}</p> : null}
        </div>
      </Card>
    </form>
  );
}
