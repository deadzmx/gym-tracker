import { getDb } from "../db/connection";
import type { Exercise } from "../types";

export interface ExerciseInput {
  name: string;
  category?: string | null;
  equipment?: string | null;
  primary_muscle?: string | null;
  description?: string | null;
}

export function listExercises(category?: string): Exercise[] {
  const db = getDb();
  if (category) {
    return db
      .prepare<[string], Exercise>(
        "SELECT * FROM exercises WHERE category = ? ORDER BY name"
      )
      .all(category);
  }
  return db
    .prepare<[], Exercise>("SELECT * FROM exercises ORDER BY name")
    .all();
}

export function getExercise(id: number): Exercise | undefined {
  return getDb()
    .prepare<[number], Exercise>("SELECT * FROM exercises WHERE id = ?")
    .get(id);
}

export function createExercise(input: ExerciseInput): Exercise {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO exercises (name, category, equipment, primary_muscle, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.category ?? null,
      input.equipment ?? null,
      input.primary_muscle ?? null,
      input.description ?? null
    );
  const created = getExercise(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to create exercise");
  }
  return created;
}

export function updateExercise(
  id: number,
  input: Partial<ExerciseInput>
): Exercise | undefined {
  const db = getDb();
  const current = getExercise(id);
  if (!current) {
    return undefined;
  }
  db.prepare(
    `UPDATE exercises
     SET name = ?, category = ?, equipment = ?, primary_muscle = ?, description = ?
     WHERE id = ?`
  ).run(
    input.name ?? current.name,
    input.category !== undefined ? input.category : current.category,
    input.equipment !== undefined ? input.equipment : current.equipment,
    input.primary_muscle !== undefined
      ? input.primary_muscle
      : current.primary_muscle,
    input.description !== undefined ? input.description : current.description,
    id
  );
  return getExercise(id);
}

export function deleteExercise(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM exercises WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
