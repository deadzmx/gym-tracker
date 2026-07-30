import { getDb } from "../db/connection";
import type { PersonalRecords, StatsSummary, VolumePoint } from "../types";

// Compute total volume across all completed sets: sum(weight * reps).
// Only completed sets are counted; null weight or reps treated as 0.
export function totalVolume(): number {
  const row = getDb()
    .prepare<[], { v: number | null }>(
      `SELECT COALESCE(SUM(weight * reps), 0) AS v
         FROM exercise_sets
         WHERE completed = 1 AND weight IS NOT NULL AND reps IS NOT NULL`
    )
    .get();
  return Math.round((row?.v ?? 0) * 100) / 100;
}

export function totalSessions(): number {
  const row = getDb()
    .prepare<[], { n: number }>(
      "SELECT COUNT(*) AS n FROM workout_sessions"
    )
    .get();
  return row?.n ?? 0;
}

// Returns the last 7 days (oldest → newest) with daily volume (kg).
// Missing days return 0 so the chart always has 7 points.
export function last7DaysVolume(today: Date = new Date()): { date: string; volume: number }[] {
  const out: { date: string; volume: number }[] = [];
  // 6 days back through today
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, volume: 0 });
  }
  const start = out[0].date;
  const end = out[out.length - 1].date;
  const rows = getDb()
    .prepare<[string, string], { day: string; v: number }>(
      `SELECT s.session_date AS day,
              COALESCE(SUM(es.weight * es.reps), 0) AS v
         FROM workout_sessions s
         LEFT JOIN exercise_sets es ON es.session_id = s.id
            AND es.completed = 1
            AND es.weight IS NOT NULL
            AND es.reps IS NOT NULL
         WHERE s.session_date BETWEEN ? AND ?
         GROUP BY s.session_date`
    )
    .all(start, end);
  const map = new Map(rows.map((r) => [r.day, r.v]));
  for (const point of out) {
    const v = map.get(point.date) ?? 0;
    point.volume = Math.round(v * 100) / 100;
  }
  return out;
}

// Current consecutive-day streak ending today (UTC).
// Counts workout_sessions per distinct session_date.
export function currentStreakDays(today: Date = new Date()): number {
  const rows = getDb()
    .prepare<[], { day: string }>(
      "SELECT DISTINCT session_date AS day FROM workout_sessions ORDER BY day DESC"
    )
    .all();
  if (rows.length === 0) return 0;
  const days = new Set(rows.map((r) => r.day));
  let streak = 0;
  const cursor = new Date(today);
  cursor.setUTCHours(0, 0, 0, 0);
  // If today has no session, allow yesterday to start the streak (so the
  // streak doesn't read 0 just because the user hasn't trained yet today).
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function getSummary(today?: Date): StatsSummary {
  return {
    total_sessions: totalSessions(),
    total_volume_kg: totalVolume(),
    current_streak_days: currentStreakDays(today),
    last_7_days_volume: last7DaysVolume(today),
  };
}

// Per-day volume + sets count for a single exercise between [from, to].
// Empty days are filled with 0 to produce a continuous series.
export function getExerciseVolume(
  exerciseId: number,
  from?: string,
  to?: string
): VolumePoint[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const toDate = to ?? todayStr;
  const fromDate = from ?? defaultFromDate(today);
  ensureWindowSize(fromDate, toDate);

  const rows = getDb()
    .prepare<
      [number, string, string],
      { day: string; v: number; sets: number }
    >(
      `SELECT s.session_date AS day,
              COALESCE(SUM(es.weight * es.reps), 0) AS v,
              COUNT(es.id) AS sets
         FROM exercise_sets es
         JOIN workout_sessions s ON s.id = es.session_id
         WHERE es.exercise_id = ?
           AND es.completed = 1
           AND s.session_date BETWEEN ? AND ?
         GROUP BY s.session_date`
    )
    .all(exerciseId, fromDate, toDate);

  const map = new Map(rows.map((r) => [r.day, r]));

  const out: VolumePoint[] = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const r = map.get(iso);
    out.push({
      date: iso,
      volume: r ? Math.round(r.v * 100) / 100 : 0,
      sets_count: r?.sets ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function defaultFromDate(today: Date): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - 29);
  return d.toISOString().slice(0, 10);
}

// Hard cap the window to keep responses small.
function ensureWindowSize(from: string, to: string): void {
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  const days = (t - f) / (1000 * 60 * 60 * 24);
  if (days > 366) {
    throw new Error("Date range too large (max 366 days)");
  }
}

// PRs: max weight, max single-set volume, max estimated 1RM (Epley).
export function getPersonalRecords(
  exerciseId: number
): PersonalRecords {
  const rows = getDb()
    .prepare<
      [number],
      {
        weight: number | null;
        reps: number | null;
        session_date: string;
        est_1rm: number | null;
        set_volume: number | null;
      }
    >(
      `SELECT es.weight, es.reps, s.session_date,
              (es.weight * (1.0 + COALESCE(es.reps, 0) / 30.0)) AS est_1rm,
              (es.weight * es.reps) AS set_volume
         FROM exercise_sets es
         JOIN workout_sessions s ON s.id = es.session_id
         WHERE es.exercise_id = ?
           AND es.completed = 1
           AND es.weight IS NOT NULL
           AND es.reps IS NOT NULL`
    )
    .all(exerciseId);

  let maxWeight: { value: number; date: string } | null = null;
  let maxVolume: { value: number; date: string } | null = null;
  let max1rm: { value: number; date: string } | null = null;

  for (const r of rows) {
    if (r.weight !== null) {
      if (!maxWeight || r.weight > maxWeight.value) {
        maxWeight = { value: r.weight, date: r.session_date };
      }
    }
    if (r.set_volume !== null) {
      if (!maxVolume || r.set_volume > maxVolume.value) {
        maxVolume = { value: r.set_volume, date: r.session_date };
      }
    }
    if (r.est_1rm !== null) {
      const v = Math.round(r.est_1rm * 100) / 100;
      if (!max1rm || v > max1rm.value) {
        max1rm = { value: v, date: r.session_date };
      }
    }
  }
  if (maxVolume) {
    maxVolume.value = Math.round(maxVolume.value * 100) / 100;
  }
  return {
    max_weight: maxWeight,
    max_volume: maxVolume,
    estimated_1rm: max1rm,
  };
}

// List PRs for ALL exercises that have any completed sets.
// Returns an array (one entry per exercise_id), useful for batch operations
// like AI plan recommendation.
export function listAllPersonalRecords(): { exercise_id: number; pr: PersonalRecords }[] {
  const ids = getDb()
    .prepare<[], { id: number }>(
      `SELECT DISTINCT exercise_id AS id FROM exercise_sets
         WHERE completed = 1 AND weight IS NOT NULL AND reps IS NOT NULL`
    )
    .all();
  return ids.map(({ id }) => ({ exercise_id: id, pr: getPersonalRecords(id) }));
}

// Calendar data: per-day summary (sessions, sets, volume) for a given window.
// Used by the heatmap visualization. Empty days are filled with zeros.
export interface CalendarDay {
  date: string;        // YYYY-MM-DD
  session_count: number;
  set_count: number;
  total_volume_kg: number;
}

export function getCalendar(
  from: string,
  to: string,
): CalendarDay[] {
  const rows = getDb()
    .prepare<
      [string, string],
      { day: string; sessions: number; sets: number; volume: number }
    >(
      `SELECT s.session_date AS day,
              COUNT(DISTINCT s.id) AS sessions,
              COUNT(es.id) AS sets,
              COALESCE(SUM(CASE WHEN es.completed = 1 THEN es.weight * es.reps ELSE 0 END), 0) AS volume
         FROM workout_sessions s
         LEFT JOIN exercise_sets es ON es.session_id = s.id
         WHERE s.session_date BETWEEN ? AND ?
         GROUP BY s.session_date`
    )
    .all(from, to);

  const map = new Map(rows.map((r) => [r.day, r]));

  const out: CalendarDay[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const r = map.get(iso);
    out.push({
      date: iso,
      session_count: r?.sessions ?? 0,
      set_count: r?.sets ?? 0,
      total_volume_kg: r ? Math.round(r.volume * 100) / 100 : 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
