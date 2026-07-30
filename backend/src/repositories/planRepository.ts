import { getDb } from "../db/connection";
import type {
  Exercise,
  PlanExercise,
  PlanExerciseWithExercise,
  WorkoutPlan,
  WorkoutPlanWithExercises,
} from "../types";

export interface PlanInput {
  name: string;
  description?: string | null;
  day_of_week?: number | null;
}

export interface PlanExerciseInput {
  exercise_id: number;
  order_index?: number | null;
  target_sets?: number | null;
  target_reps?: number | null;
  target_weight?: number | null;
  rest_seconds?: number | null;
}

export interface PlanCreateInput extends PlanInput {
  exercises?: PlanExerciseInput[];
}

export interface PlanUpdateInput extends Partial<PlanInput> {
  exercises?: PlanExerciseInput[];
}

export function listPlans(): WorkoutPlan[] {
  return getDb()
    .prepare<[], WorkoutPlan>(
      "SELECT * FROM workout_plans ORDER BY id DESC"
    )
    .all();
}

export function getPlan(id: number): WorkoutPlan | undefined {
  return getDb()
    .prepare<[number], WorkoutPlan>(
      "SELECT * FROM workout_plans WHERE id = ?"
    )
    .get(id);
}

export function getPlanExercises(
  planId: number
): PlanExerciseWithExercise[] {
  const db = getDb();
  // Join in one query so the row order matches plan_exercises.
  return db
    .prepare<[number], PlanExerciseWithExercise>(
      `SELECT
         pe.id, pe.plan_id, pe.exercise_id, pe.order_index,
         pe.target_sets, pe.target_reps, pe.target_weight, pe.rest_seconds,
         json_object(
           'id', e.id,
           'name', e.name,
           'category', e.category,
           'equipment', e.equipment,
           'primary_muscle', e.primary_muscle,
           'description', e.description,
           'created_at', e.created_at
         ) AS exercise
       FROM plan_exercises pe
       LEFT JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.plan_id = ?
       ORDER BY pe.order_index, pe.id`
    )
    .all(planId)
    .map((row) => ({
      ...row,
      exercise: row.exercise ? (JSON.parse(row.exercise as unknown as string) as Exercise) : null,
    }));
}

export function getPlanWithExercises(
  id: number
): WorkoutPlanWithExercises | undefined {
  const plan = getPlan(id);
  if (!plan) return undefined;
  return { ...plan, exercises: getPlanExercises(id) };
}

export function createPlan(input: PlanCreateInput): WorkoutPlanWithExercises {
  const db = getDb();
  const tx = db.transaction((data: PlanCreateInput): WorkoutPlanWithExercises => {
    const result = db
      .prepare(
        `INSERT INTO workout_plans (name, description, day_of_week)
         VALUES (?, ?, ?)`
      )
      .run(data.name, data.description ?? null, data.day_of_week ?? null);
    const planId = Number(result.lastInsertRowid);
    if (data.exercises && data.exercises.length > 0) {
      insertPlanExercises(planId, data.exercises);
    }
    const created = getPlan(planId);
    if (!created) {
      throw new Error("Failed to create plan");
    }
    return { ...created, exercises: getPlanExercises(planId) };
  });
  return tx(input);
}

export function updatePlan(
  id: number,
  input: PlanUpdateInput
): WorkoutPlanWithExercises | undefined {
  const db = getDb();
  const existing = getPlan(id);
  if (!existing) return undefined;
  const tx = db.transaction((data: PlanUpdateInput): WorkoutPlanWithExercises => {
    db.prepare(
      `UPDATE workout_plans
       SET name = ?, description = ?, day_of_week = ?
       WHERE id = ?`
    ).run(
      data.name ?? existing.name,
      data.description !== undefined ? data.description : existing.description,
      data.day_of_week !== undefined ? data.day_of_week : existing.day_of_week,
      id
    );
    if (data.exercises !== undefined) {
      db.prepare("DELETE FROM plan_exercises WHERE plan_id = ?").run(id);
      if (data.exercises.length > 0) {
        insertPlanExercises(id, data.exercises);
      }
    }
    const updated = getPlan(id);
    if (!updated) {
      throw new Error("Plan disappeared during update");
    }
    return { ...updated, exercises: getPlanExercises(id) };
  });
  return tx(input);
}

export function deletePlan(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM workout_plans WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

function insertPlanExercises(
  planId: number,
  exercises: PlanExerciseInput[]
): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO plan_exercises
       (plan_id, exercise_id, order_index, target_sets, target_reps, target_weight, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const ex of exercises) {
    stmt.run(
      planId,
      ex.exercise_id,
      ex.order_index ?? null,
      ex.target_sets ?? null,
      ex.target_reps ?? null,
      ex.target_weight ?? null,
      ex.rest_seconds ?? null
    );
  }
}
