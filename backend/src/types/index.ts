// Shared types for the gym tracker backend.

export type Category =
  | "胸"
  | "背"
  | "腿"
  | "肩"
  | "臂"
  | "核心"
  | "有氧";

export type Equipment =
  | "杠铃"
  | "哑铃"
  | "器械"
  | "绳索"
  | "徒手";

export interface Exercise {
  id: number;
  name: string;
  category: Category | null;
  equipment: Equipment | null;
  primary_muscle: string | null;
  description: string | null;
  image_url: string | null;       // Emoji or external image URL for illustration
  created_at: string;
}

export interface PlanExercise {
  id: number;
  plan_id: number;
  exercise_id: number;
  order_index: number | null;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  rest_seconds: number | null;
}

export interface PlanExerciseWithExercise extends PlanExercise {
  exercise: Exercise | null;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string | null;
  day_of_week: number | null;
  created_at: string;
}

export interface WorkoutPlanWithExercises extends WorkoutPlan {
  exercises: PlanExerciseWithExercise[];
}

export interface WorkoutSession {
  id: number;
  plan_id: number | null;
  session_date: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface ExerciseSet {
  id: number;
  session_id: number;
  exercise_id: number;
  plan_exercise_id: number | null;
  set_index: number | null;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  completed: number | null;
}

export interface ExerciseSetWithExercise extends ExerciseSet {
  exercise: Exercise | null;
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  plan: WorkoutPlan | null;
  sets: ExerciseSetWithExercise[];
}

export interface StatsSummary {
  total_sessions: number;
  total_volume_kg: number;
  current_streak_days: number;
  last_7_days_volume: { date: string; volume: number }[];
}

export interface VolumePoint {
  date: string;
  volume: number;
  sets_count: number;
}

export interface PersonalRecords {
  max_weight: { value: number; date: string } | null;
  max_volume: { value: number; date: string } | null;
  estimated_1rm: { value: number; date: string } | null;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

// ===== AI Plan Recommendation types =====

export type Goal = "muscle" | "fat_loss" | "strength" | "balanced";
export type Experience = "beginner" | "intermediate" | "advanced";
export type LlmProvider = "minimax" | "zhipu";

export interface RecommendInput {
  goal: Goal;
  experience: Experience;
  days_per_week: 3 | 4 | 5 | 6;
  available_equipment: Equipment[];
  session_duration_min: 30 | 45 | 60 | 75 | 90;
  focus_areas?: Category[];
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
  day_of_week: number; // 0=Sun, 1=Mon, ... 6=Sat
  exercises: RecommendedDayExercise[];
}

export interface RecommendOutput {
  name: string;
  description: string;
  days: RecommendedDay[];
  rationale: string;
  source: "rule_engine" | "llm";
  provider: LlmProvider | null;
}
