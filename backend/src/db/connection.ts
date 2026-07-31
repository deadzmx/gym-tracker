import Database, { type Database as DB } from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
import { SEED_EXERCISES } from "../seed/exercises";

// Default database location: backend/data/gym.db
// Can be overridden by the DB_PATH env var.
const DEFAULT_DB_PATH = path.resolve(process.cwd(), "data", "gym.db");

let db: DB | null = null;

export function getDbPath(): string {
  return process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : DEFAULT_DB_PATH;
}

export function getDb(): DB {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb(dbPath: string = getDbPath()): DB {
  if (db) {
    return db;
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  applySchema(instance);
  seedExercisesIfEmpty(instance);

  db = instance;
  return instance;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function applySchema(instance: DB): void {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      equipment TEXT,
      primary_muscle TEXT,
      description TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      day_of_week INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plan_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER,
      target_sets INTEGER,
      target_reps INTEGER,
      target_weight REAL,
      rest_seconds INTEGER,
      FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      session_date TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      notes TEXT,
      FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      plan_exercise_id INTEGER,
      set_index INTEGER,
      reps INTEGER,
      weight REAL,
      rpe REAL,
      completed INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
      FOREIGN KEY (plan_exercise_id) REFERENCES plan_exercises(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan ON plan_exercises(plan_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON workout_sessions(session_date);
    CREATE INDEX IF NOT EXISTS idx_sets_session ON exercise_sets(session_id);
    CREATE INDEX IF NOT EXISTS idx_sets_exercise ON exercise_sets(exercise_id);
  `);

  // ─── Migrations for pre-existing databases ───
  // SQLite has no `ADD COLUMN IF NOT EXISTS`, so we check first.
  const cols = instance
    .prepare("PRAGMA table_info(exercises)")
    .all() as Array<{ name: string }>;
  const hasImageCol = cols.some((c) => c.name === "image_url");
  if (!hasImageCol) {
    instance.exec("ALTER TABLE exercises ADD COLUMN image_url TEXT");
  }
}

function seedExercisesIfEmpty(instance: DB): void {
  const row = instance
    .prepare("SELECT COUNT(*) AS n FROM exercises")
    .get() as { n: number };
  if (row.n > 0) {
    // DB already has data — still update existing rows' image_url if missing
    // (covers the migration case where the table existed but lacked the column)
    const updateImg = instance.prepare(
      "UPDATE exercises SET image_url = ? WHERE name = ? AND (image_url IS NULL OR image_url = '')"
    );
    for (const r of SEED_EXERCISES) {
      updateImg.run(r.image_url, r.name);
    }
    return;
  }
  const insert = instance.prepare(
    `INSERT INTO exercises (name, category, equipment, primary_muscle, description, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertMany = instance.transaction(
    (rows: typeof SEED_EXERCISES) => {
      for (const r of rows) {
        insert.run(
          r.name,
          r.category,
          r.equipment,
          r.primary_muscle,
          r.description,
          r.image_url
        );
      }
    }
  );
  insertMany(SEED_EXERCISES);
}

// Helper for tests: create a fresh in-memory or temp file db.
export function createTestDb(dbPath: string): DB {
  return initDb(dbPath);
}
