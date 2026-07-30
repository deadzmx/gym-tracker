import { describe, it, expect } from "vitest";
import request from "supertest";
import { useFreshDb, buildTestApp } from "./helpers";

describe("stats API", () => {
  useFreshDb();
  const app = buildTestApp();

  async function getExerciseId(name: string): Promise<number> {
    const res = await request(app).get("/api/exercises");
    const found = res.body.data.find((e: { name: string }) => e.name === name);
    if (!found) throw new Error(`Exercise not found in seed: ${name}`);
    return found.id as number;
  }

  async function seedSessionWithSets(
    exerciseId: number,
    date: string,
    sets: { reps: number; weight: number }[]
  ): Promise<number> {
    const start = await request(app)
      .post("/api/sessions")
      .send({ session_date: date });
    const id = start.body.data.id as number;
    const payload = {
      sets: sets.map((s, i) => ({
        exercise_id: exerciseId,
        set_index: i + 1,
        reps: s.reps,
        weight: s.weight,
        completed: true,
      })),
    };
    const res = await request(app)
      .post(`/api/sessions/${id}/sets`)
      .send(payload);
    expect(res.status).toBe(201);
    return id;
  }

  it("returns zero summary when no data exists", async () => {
    const res = await request(app).get("/api/stats/summary");
    expect(res.status).toBe(200);
    expect(res.body.data.total_sessions).toBe(0);
    expect(res.body.data.total_volume_kg).toBe(0);
    expect(res.body.data.current_streak_days).toBe(0);
    expect(res.body.data.last_7_days_volume).toHaveLength(7);
    for (const p of res.body.data.last_7_days_volume) {
      expect(p.volume).toBe(0);
    }
  });

  it("computes total volume and session count from seeded sets", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    await seedSessionWithSets(benchId, today, [
      { reps: 8, weight: 60 },
      { reps: 8, weight: 60 },
    ]); // 960
    await seedSessionWithSets(benchId, yesterday, [{ reps: 5, weight: 50 }]); // 250

    const res = await request(app).get("/api/stats/summary");
    expect(res.status).toBe(200);
    expect(res.body.data.total_sessions).toBe(2);
    expect(res.body.data.total_volume_kg).toBeCloseTo(1210, 2);
    expect(res.body.data.current_streak_days).toBeGreaterThanOrEqual(2);

    // Today and yesterday should each show non-zero volume.
    const days = res.body.data.last_7_days_volume;
    const todayPoint = days.find((d: { date: string }) => d.date === today);
    const yPoint = days.find((d: { date: string }) => d.date === yesterday);
    expect(todayPoint.volume).toBeCloseTo(960, 2);
    expect(yPoint.volume).toBeCloseTo(250, 2);
  });

  it("returns per-day volume with empty days filled as zero", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    await seedSessionWithSets(benchId, "2024-06-01", [
      { reps: 10, weight: 50 },
    ]); // 500
    await seedSessionWithSets(benchId, "2024-06-03", [
      { reps: 5, weight: 60 },
      { reps: 5, weight: 60 },
    ]); // 600

    const res = await request(app)
      .get("/api/stats/volume")
      .query({ exercise_id: benchId, from: "2024-06-01", to: "2024-06-04" });
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toHaveLength(4);
    expect(data[0]).toMatchObject({ date: "2024-06-01", volume: 500, sets_count: 1 });
    expect(data[1]).toMatchObject({ date: "2024-06-02", volume: 0, sets_count: 0 });
    expect(data[2]).toMatchObject({ date: "2024-06-03", volume: 600, sets_count: 2 });
    expect(data[3]).toMatchObject({ date: "2024-06-04", volume: 0, sets_count: 0 });
  });

  it("rejects volume request without exercise_id", async () => {
    const res = await request(app).get("/api/stats/volume");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("computes personal records with Epley 1RM", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    // Day 1: 8 reps @ 60 → volume 480, 1RM 76
    await seedSessionWithSets(benchId, "2024-07-01", [
      { reps: 8, weight: 60 },
    ]);
    // Day 2: 5 reps @ 80 → volume 400, 1RM 93.33
    await seedSessionWithSets(benchId, "2024-07-10", [
      { reps: 5, weight: 80 },
    ]);
    // Day 3: 3 reps @ 90 → volume 270, 1RM 99  → max weight
    await seedSessionWithSets(benchId, "2024-07-15", [
      { reps: 3, weight: 90 },
    ]);

    const res = await request(app)
      .get("/api/stats/personal-records")
      .query({ exercise_id: benchId });
    expect(res.status).toBe(200);
    const pr = res.body.data;
    // Max weight came from the heaviest single set: 90kg on 2024-07-15.
    expect(pr.max_weight).toEqual({ value: 90, date: "2024-07-15" });
    // Max set volume (reps * weight) came from day 1: 8*60 = 480.
    expect(pr.max_volume).toEqual({ value: 480, date: "2024-07-01" });
    // Max estimated 1RM: 90 * (1 + 3/30) = 99 on 2024-07-15.
    expect(pr.estimated_1rm).toEqual({ value: 99, date: "2024-07-15" });
  });

  it("returns null PRs when there are no sets for the exercise", async () => {
    const flyId = await getExerciseId("哑铃飞鸟");
    const res = await request(app)
      .get("/api/stats/personal-records")
      .query({ exercise_id: flyId });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      max_weight: null,
      max_volume: null,
      estimated_1rm: null,
    });
  });
});
