// Shared TypeScript types — must match the backend exactly.

export type ExerciseCategory =
  | '胸'
  | '背'
  | '腿'
  | '肩'
  | '臂'
  | '核心'
  | '有氧';

export type Equipment =
  | '杠铃'
  | '哑铃'
  | '器械'
  | '绳索'
  | '徒手';

export type Goal = 'muscle' | 'fat_loss' | 'strength' | 'balanced';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type LlmProvider = 'minimax' | 'zhipu';

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  primary_muscle: string;
  description: string | null;
  image_url: string | null;       // Emoji or external image URL
  created_at: string;             // ISO 8601
}

export interface ExerciseInput {
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  primary_muscle: string;
  description?: string | null;
  image_url?: string | null;
}

export interface PlanExercise {
  id: number;
  plan_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  rest_seconds: number;
  // Optional enriched fields (backend may return joined exercise data):
  exercise?: Exercise;
}

export interface PlanExerciseInput {
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight?: number | null;
  rest_seconds: number;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string | null;
  day_of_week: number | null; // 0-6, Sunday = 0
  created_at: string;
  // Detail endpoints embed plan_exercises:
  plan_exercises?: PlanExercise[];
}

export interface WorkoutPlanInput {
  name: string;
  description?: string | null;
  day_of_week?: number | null;
  exercises?: PlanExerciseInput[];
}

export interface ExerciseSet {
  id: number;
  session_id: number;
  exercise_id: number;
  plan_exercise_id: number | null;
  set_index: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
  // Optional joined data:
  exercise?: Exercise;
}

export interface ExerciseSetInput {
  exercise_id: number;
  plan_exercise_id?: number | null;
  set_index: number;
  reps: number;
  weight: number;
  rpe?: number | null;
  completed?: boolean;
}

export interface WorkoutSession {
  id: number;
  plan_id: number | null;
  session_date: string; // YYYY-MM-DD
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  // Optional embedded data:
  plan?: WorkoutPlan | null;
  sets?: ExerciseSet[];
  total_volume?: number;
}

export interface WorkoutSessionInput {
  plan_id?: number | null;
  session_date: string;
}

export interface SessionPatchInput {
  finished_at?: string | null;
  notes?: string | null;
  plan_id?: number | null;
  session_date?: string;
}

export interface StatsSummary {
  total_sessions: number;
  total_volume: number;
  streak_days: number;
}

export interface VolumePoint {
  date: string; // YYYY-MM-DD
  volume: number;
  sets: number;
}

export interface PersonalRecord {
  exercise_id: number;
  max_weight: number;
  max_volume: number;
  estimated_1rm: number;
  achieved_at: string | null;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

// Calendar heatmap
export interface CalendarHeatmapDay {
  date: string;
  session_count: number;
  set_count: number;
  total_volume_kg: number;
}

// ===== AI Plan Recommendation types (新增) =====

export interface RecommendInput {
  goal: Goal;
  experience: Experience;
  days_per_week: 3 | 4 | 5 | 6;
  available_equipment: Equipment[];
  session_duration_min: 30 | 45 | 60 | 75 | 90;
  focus_areas?: ExerciseCategory[];
  notes?: string;
  llm?: {
    provider: LlmProvider;
    api_key: string;
  };
}

export interface RecommendedDayExercise {
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  rest_seconds: number;
}

export interface RecommendedDay {
  name: string;
  day_of_week: number;
  exercises: RecommendedDayExercise[];
}

export interface RecommendOutput {
  name: string;
  description: string;
  days: RecommendedDay[];
  rationale: string;
  source: 'rule_engine' | 'llm';
  provider: LlmProvider | null;
}

export interface RecommendResponse {
  data: RecommendOutput;
  degraded: boolean;
  warning: string | null;
}

export interface LlmTestResult {
  ok: boolean;
  message: string;
}

export interface AppSettings {
  llm: {
    provider: LlmProvider;
    api_key: string;
  } | null;
}
