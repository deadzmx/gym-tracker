// Rule-based plan recommender.
// Produces a weekly split based on goal, experience, days/week, equipment.
// Pure function — no DB / no LLM. Easy to test.

import type {
  Category,
  Equipment,
  Exercise,
  Experience,
  Goal,
  RecommendedDay,
  RecommendedDayExercise,
  RecommendInput,
  RecommendOutput,
} from "../types";

interface DayTemplate {
  name: string;
  categories: Category[];
}

const SPLITS: Record<3 | 4 | 5 | 6, DayTemplate[]> = {
  3: [
    { name: "全身 - 推", categories: ["胸", "肩", "臂"] },
    { name: "全身 - 拉", categories: ["背", "臂"] },
    { name: "全身 - 腿 + 核心", categories: ["腿", "核心"] },
  ],
  4: [
    { name: "上推", categories: ["胸", "肩", "臂"] },
    { name: "上拉", categories: ["背", "臂"] },
    { name: "下肢", categories: ["腿", "核心"] },
    { name: "上肢补充", categories: ["肩", "臂", "核心"] },
  ],
  5: [
    { name: "胸 + 三头", categories: ["胸", "臂"] },
    { name: "背 + 二头", categories: ["背", "臂"] },
    { name: "腿", categories: ["腿"] },
    { name: "肩", categories: ["肩"] },
    { name: "核心 + 弱项", categories: ["核心", "臂"] },
  ],
  6: [
    { name: "胸", categories: ["胸"] },
    { name: "背", categories: ["背"] },
    { name: "腿", categories: ["腿"] },
    { name: "肩", categories: ["肩"] },
    { name: "臂(轻)", categories: ["臂"] },
    { name: "核心 + 弱项", categories: ["核心", "背", "腿"] },
  ],
};

// Day-of-week distribution for N training days. Spread as evenly as possible.
function distributeDays(days: number): number[] {
  // 0=Sun, 1=Mon, ... 6=Sat. We avoid 0 (Sunday) by default.
  const preferred: Record<number, number[]> = {
    3: [1, 3, 5], // Mon Wed Fri
    4: [1, 2, 4, 5], // Mon Tue Thu Fri
    5: [1, 2, 3, 5, 6], // Mon Tue Wed Fri Sat
    6: [1, 2, 3, 4, 5, 6], // Mon-Sat
  };
  return preferred[days] || preferred[3];
}

// Per-goal + experience volume parameters
const VOLUME: Record<Goal, Record<Experience, { sets: number; reps: number; rest: number }>> = {
  muscle: {
    beginner: { sets: 3, reps: 10, rest: 75 },
    intermediate: { sets: 4, reps: 8, rest: 90 },
    advanced: { sets: 5, reps: 6, rest: 120 },
  },
  strength: {
    beginner: { sets: 3, reps: 6, rest: 120 },
    intermediate: { sets: 4, reps: 5, rest: 150 },
    advanced: { sets: 5, reps: 3, rest: 180 },
  },
  fat_loss: {
    beginner: { sets: 3, reps: 12, rest: 45 },
    intermediate: { sets: 4, reps: 12, rest: 45 },
    advanced: { sets: 4, reps: 15, rest: 45 },
  },
  balanced: {
    beginner: { sets: 3, reps: 10, rest: 60 },
    intermediate: { sets: 4, reps: 10, rest: 75 },
    advanced: { sets: 4, reps: 8, rest: 90 },
  },
};

const EXERCISES_PER_CATEGORY = 2; // how many exercises to pick per category per day

// Per-goal: percentage of 1RM to use as starting weight
const WEIGHT_PCT: Record<Goal, number> = {
  muscle: 0.70,        // hypertrophy 65-75%
  strength: 0.85,      // strength 80-90%
  fat_loss: 0.65,      // fat loss 60-70%
  balanced: 0.72,      // balanced 70-75%
};

export interface PrMap {
  [exerciseId: number]: number; // estimated 1RM (kg), or max weight if no 1RM
}

function roundToPlate(weight: number): number {
  // Round to nearest 2.5kg (standard plate increments)
  return Math.round(weight / 2.5) * 2.5;
}

function suggestStartingWeight(prMap: PrMap, exerciseId: number, goal: Goal): number | null {
  const oneRm = prMap[exerciseId];
  if (!oneRm || oneRm <= 0) return null;
  const pct = WEIGHT_PCT[goal];
  const suggested = oneRm * pct;
  // Floor at 5kg to avoid zero or sub-minimal values
  return Math.max(5, roundToPlate(suggested));
}

function pickExercises(
  pool: Exercise[],
  category: Category,
  equipment: Equipment[] | null,
  n: number,
  usedIds: Set<number>,
): Exercise[] {
  const matches = pool.filter(
    (e) =>
      e.category === category &&
      (equipment === null || equipment.length === 0 || (e.equipment !== null && equipment.includes(e.equipment))) &&
      !usedIds.has(e.id),
  );
  // Prioritize compound lifts (杠铃/哑铃) over isolation
  matches.sort((a, b) => {
    const score = (e: Exercise): number => {
      if (e.equipment === "杠铃") return 3;
      if (e.equipment === "哑铃") return 2;
      if (e.equipment === "器械") return 1;
      return 0;
    };
    return score(b) - score(a);
  });
  return matches.slice(0, n);
}

export function recommend(
  input: RecommendInput,
  exercisePool: Exercise[],
  prMap: PrMap = {},
): RecommendOutput {
  const days = input.days_per_week;
  const split = SPLITS[days];
  const dows = distributeDays(days);
  const vol = VOLUME[input.goal][input.experience];

  const usedIds = new Set<number>();
  const recommendedDays: RecommendedDay[] = split.map((tpl, idx) => {
    const exercises: RecommendedDayExercise[] = [];
    let order = 0;
    for (const cat of tpl.categories) {
      // Pull a few exercises per category. Cap at 2-3 per category to keep session reasonable.
      const perCat = Math.min(EXERCISES_PER_CATEGORY, 3);
      const picked = pickExercises(exercisePool, cat, input.available_equipment, perCat, usedIds);
      for (const ex of picked) {
        usedIds.add(ex.id);
        exercises.push({
          exercise_id: ex.id,
          order_index: order++,
          target_sets: vol.sets,
          target_reps: vol.reps,
          target_weight: suggestStartingWeight(prMap, ex.id, input.goal),
          rest_seconds: vol.rest,
        });
      }
    }
    return {
      name: tpl.name,
      day_of_week: dows[idx] ?? idx,
      exercises,
    };
  });

  const goalName: Record<Goal, string> = {
    muscle: "增肌",
    fat_loss: "减脂",
    strength: "力量",
    balanced: "综合",
  };
  const expName: Record<Experience, string> = {
    beginner: "初学者",
    intermediate: "中级",
    advanced: "高级",
  };

  const totalExercises = recommendedDays.reduce((acc, d) => acc + d.exercises.length, 0);
  const withWeight = recommendedDays.reduce(
    (acc, d) => acc + d.exercises.filter((e) => e.target_weight !== null).length,
    0,
  );
  const pct = Math.round(WEIGHT_PCT[input.goal] * 100);

  const rationale = [
    `目标:${goalName[input.goal]},经验:${expName[input.experience]},每周 ${days} 天。`,
    `采用 ${days} 天分法 (${recommendedDays.map((d) => d.name.split(" - ")[0]).join(" / ")}),`,
    `每组 ${vol.sets}×${vol.reps},组间休息 ${vol.rest}s。`,
    `总计 ${totalExercises} 个动作,基于你可选的器械 (${input.available_equipment.join("/")}) 选自动作库。`,
    withWeight > 0
      ? `已根据你 ${withWeight} 个动作的 PR 估算 1RM,按 ${pct}% 推算起始重量(最近 2.5kg 取整,空表示无历史记录)。`
      : `暂无历史 PR,target_weight 留空,首次训练建议用 60-70% 1RM 的重量,完成所有组后逐步加重量。`,
  ].join(" ");

  return {
    name: `${days} 天 ${goalName[input.goal]} 计划 - ${expName[input.experience]}`,
    description: `${recommendedDays.length} 天 split,基于目标(${goalName[input.goal]})和经验(${expName[input.experience]})自动生成。`,
    days: recommendedDays,
    rationale,
    source: "rule_engine",
    provider: null,
  };
}
