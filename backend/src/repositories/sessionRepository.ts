import { getDb } from "../db/connection";
import type {
  Exercise,
  ExerciseSet,
  ExerciseSetWithExercise,
  WorkoutPlan,
  WorkoutSession,
  WorkoutSessionWithSets,
} from "../types";

export interface SessionInput {
  plan_id?: number | null;
  session_date: string;
  notes?: string | null;
}

export interface SessionUpdateInput {
  plan_id?: number | null;
  session_date?: string;
  started_at?: string;
  finished_at?: string | null;
  notes?: string | null;
}

export interface SetInput {
  exercise_id: number;
  plan_exercise_id?: number | null;
  set_index?: number | null;
  reps?: number | null;
  weight?: number | null;
  rpe?: number | null;
  completed?: boolean | null;
}

export interface SessionListFilter {
  from?: string;
  to?: string;
  limit?: number;
}

export function listSessions(
  filter: SessionListFilter = {}
): WorkoutSession[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.from) {
    conditions.push("session_date >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("session_date <= ?");
    params.push(filter.to);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filter.limit ?? 50;
  const sql = `SELECT * FROM workout_sessions ${where} ORDER BY session_date DESC, id DESC LIMIT ?`;
  params.push(limit);
  return getDb()
    .prepare<typeof params, WorkoutSession>(sql)
    .all(...params);
}

export function getSession(id: number): WorkoutSession | undefined {
  return getDb()
    .prepare<[number], WorkoutSession>(
      "SELECT * FROM workout_sessions WHERE id = ?"
    )
    .get(id);
}

export function getSessionSets(
  sessionId: number
): ExerciseSetWithExercise[] {
  const db = getDb();
  return db
    .prepare<[number], ExerciseSetWithExercise>(
      `SELECT
         s.id, s.session_id, s.exercise_id, s.plan_exercise_id,
         s.set_index, s.reps, s.weight, s.rpe, s.completed,
         json_object(
           'id', e.id,
           'name', e.name,
           'category', e.category,
           'equipment', e.equipment,
           'primary_muscle', e.primary_muscle,
           'description', e.description,
           'created_at', e.created_at
         ) AS exercise
       FROM exercise_sets s
       LEFT JOIN exercises e ON e.id = s.exercise_id
       WHERE s.session_id = ?
       ORDER BY s.set_index, s.id`
    )
    .all(sessionId)
    .map((row) => ({
      ...row,
      exercise: row.exercise
        ? (JSON.parse(row.exercise as unknown as string) as Exercise)
        : null,
    }));
}

export function getSessionWithSets(
  id: number
): WorkoutSessionWithSets | undefined {
  const session = getSession(id);
  if (!session) return undefined;
  const plan = session.plan_id
    ? (getDb()
        .prepare("SELECT * FROM workout_plans WHERE id = ?")
        .get(session.plan_id) as WorkoutPlan | undefined) ?? null
    : null;
  return {
    ...session,
    plan,
    sets: getSessionSets(id),
  };
}

export function createSession(input: SessionInput): WorkoutSession {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO workout_sessions (plan_id, session_date, notes)
       VALUES (?, ?, ?)`
    )
    .run(
      input.plan_id ?? null,
      input.session_date,
      input.notes ?? null
    );
  const created = getSession(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to create session");
  }
  return created;
}

export function updateSession(
  id: number,
  input: SessionUpdateInput
): WorkoutSession | undefined {
  const existing = getSession(id);
  if (!existing) return undefined;
  const db = getDb();
  db.prepare(
    `UPDATE workout_sessions
     SET plan_id = ?, session_date = ?, started_at = ?, finished_at = ?, notes = ?
     WHERE id = ?`
  ).run(
    input.plan_id !== undefined ? input.plan_id : existing.plan_id,
    input.session_date ?? existing.session_date,
    input.started_at ?? existing.started_at,
    input.finished_at !== undefined ? input.finished_at : existing.finished_at,
    input.notes !== undefined ? input.notes : existing.notes,
    id
  );
  return getSession(id);
}

export function deleteSession(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM workout_sessions WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function addSessionSets(
  sessionId: number,
  sets: SetInput[]
): ExerciseSet[] {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO exercise_sets
       (session_id, exercise_id, plan_exercise_id, set_index, reps, weight, rpe, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const created: ExerciseSet[] = [];
  const insertAll = db.transaction((rows: SetInput[]) => {
    for (const r of rows) {
      const result = stmt.run(
        sessionId,
        r.exercise_id,
        r.plan_exercise_id ?? null,
        r.set_index ?? null,
        r.reps ?? null,
        r.weight ?? null,
        r.rpe ?? null,
        r.completed === null || r.completed === undefined ? 1 : r.completed ? 1 : 0
      );
      const row = db
        .prepare("SELECT * FROM exercise_sets WHERE id = ?")
        .get(Number(result.lastInsertRowid)) as ExerciseSet;
      created.push(row);
    }
  });
  insertAll(sets);
  return created;
}

export function getSet(id: number): ExerciseSet | undefined {
  return getDb()
    .prepare<[number], ExerciseSet>(
      "SELECT * FROM exercise_sets WHERE id = ?"
    )
    .get(id);
}

export function updateSet(
  id: number,
  input: Partial<SetInput>
): ExerciseSet | undefined {
  const existing = getSet(id);
  if (!existing) return undefined;
  const db = getDb();
  db.prepare(
    `UPDATE exercise_sets
     SET exercise_id = ?, plan_exercise_id = ?, set_index = ?,
         reps = ?, weight = ?, rpe = ?, completed = ?
     WHERE id = ?`
  ).run(
    input.exercise_id ?? existing.exercise_id,
    input.plan_exercise_id !== undefined
      ? input.plan_exercise_id
      : existing.plan_exercise_id,
    input.set_index !== undefined ? input.set_index : existing.set_index,
    input.reps !== undefined ? input.reps : existing.reps,
    input.weight !== undefined ? input.weight : existing.weight,
    input.rpe !== undefined ? input.rpe : existing.rpe,
    input.completed === null || input.completed === undefined
      ? existing.completed
      : input.completed
        ? 1
        : 0,
    id
  );
  return getSet(id);
}

export function deleteSet(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM exercise_sets WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
