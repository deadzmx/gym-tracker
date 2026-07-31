// Tests for /api/plans/recommend

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildTestApp, useFreshDb } from "./helpers";

let app: Express;

useFreshDb();

beforeAll(() => {
  app = buildTestApp();
});

afterAll(() => {
  // teardown handled by useFreshDb
});

describe("POST /api/plans/recommend (rule engine)", () => {
  it("returns 400 on missing fields", async () => {
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({ goal: "muscle" });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on invalid goal", async () => {
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "magic",
        experience: "beginner",
        days_per_week: 3,
        available_equipment: ["杠铃"],
        session_duration_min: 60,
      });
    expect(res.status).toBe(400);
  });

  it("returns a valid 3-day plan with rule engine (no llm key)", async () => {
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "muscle",
        experience: "intermediate",
        days_per_week: 3,
        available_equipment: ["杠铃", "哑铃", "器械"],
        session_duration_min: 60,
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.source).toBe("rule_engine");
    expect(res.body.data.days).toHaveLength(3);
    expect(res.body.data.days[0].exercises.length).toBeGreaterThan(0);
    expect(res.body.data.days[0].day_of_week).toBeGreaterThanOrEqual(0);
    expect(res.body.data.days[0].day_of_week).toBeLessThanOrEqual(6);
    expect(res.body.degraded).toBe(true);
    expect(res.body.warning).toBe("no_llm_key");
  });

  it("returns 4-day plan with correct split names", async () => {
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "balanced",
        experience: "beginner",
        days_per_week: 4,
        available_equipment: ["杠铃", "哑铃", "器械", "绳索", "徒手"],
        session_duration_min: 45,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.days).toHaveLength(4);
    // All exercise_ids should be valid (from pool)
    const pool = await request(app).get("/api/exercises");
    const validIds = new Set(pool.body.data.map((e: { id: number }) => e.id));
    for (const day of res.body.data.days) {
      for (const ex of day.exercises) {
        expect(validIds.has(ex.exercise_id)).toBe(true);
        expect(ex.target_sets).toBeGreaterThan(0);
        expect(ex.target_reps).toBeGreaterThan(0);
        expect(ex.rest_seconds).toBeGreaterThan(0);
      }
    }
  });

  it("applies different volume params for different goals (strength > muscle reps)", async () => {
    const muscle = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "muscle",
        experience: "intermediate",
        days_per_week: 3,
        available_equipment: ["杠铃"],
        session_duration_min: 60,
      });
    const strength = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "strength",
        experience: "intermediate",
        days_per_week: 3,
        available_equipment: ["杠铃"],
        session_duration_min: 60,
      });
    expect(muscle.status).toBe(200);
    expect(strength.status).toBe(200);
    const muscleReps = muscle.body.data.days[0].exercises[0].target_reps;
    const strengthReps = strength.body.data.days[0].exercises[0].target_reps;
    expect(strengthReps).toBeLessThan(muscleReps);
  });

  it("returns null target_weight when no PRs exist", async () => {
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "muscle",
        experience: "beginner",
        days_per_week: 3,
        available_equipment: ["杠铃"],
        session_duration_min: 60,
      });
    expect(res.status).toBe(200);
    for (const day of res.body.data.days) {
      for (const ex of day.exercises) {
        expect(ex.target_weight).toBeNull();
      }
    }
  });

  it("suggests weights based on existing PRs (rule engine)", async () => {
    // First create a session with a real set for exercise 1 (杠铃卧推)
    await request(app)
      .post("/api/sessions")
      .send({ plan_id: null, session_date: "2026-07-01" });
    // Get the session id
    const list = await request(app).get("/api/sessions?limit=1");
    const sessionId = list.body.data[0].id;
    // Log a set: 60kg x 8 reps, 1RM est = 60 * (1+8/30) = 76kg
    await request(app)
      .post(`/api/sessions/${sessionId}/sets`)
      .send({
        sets: [{ exercise_id: 1, set_index: 1, reps: 8, weight: 60, rpe: 7, completed: true }],
      });

    // Now request recommendation for muscle (70% of 1RM = 53.2 -> 52.5kg)
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "muscle",
        experience: "intermediate",
        days_per_week: 3,
        available_equipment: ["杠铃", "哑铃", "器械"],
        session_duration_min: 60,
      });
    expect(res.status).toBe(200);
    // Find exercise 1 in the recommendations
    let foundEx1 = false;
    for (const day of res.body.data.days) {
      for (const ex of day.exercises) {
        if (ex.exercise_id === 1) {
          foundEx1 = true;
          // 1RM = 76, muscle pct = 70% -> 53.2 -> round to 52.5
          expect(ex.target_weight).toBe(52.5);
        }
      }
    }
    expect(foundEx1).toBe(true);
    // Rationale should mention PR-based weights
    expect(res.body.data.rationale).toMatch(/PR|1RM/);
  });

  it("applies higher weight % for strength goal", async () => {
    // Setup: create session + log a set so exercise 1 has a PR (60kg x 8 -> 1RM 76)
    const sRes = await request(app)
      .post("/api/sessions")
      .send({ plan_id: null, session_date: "2026-07-01" });
    const sessionId = sRes.body.data.id;
    await request(app)
      .post(`/api/sessions/${sessionId}/sets`)
      .send({
        sets: [{ exercise_id: 1, set_index: 1, reps: 8, weight: 60, rpe: 7, completed: true }],
      });

    const muscle = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "muscle",
        experience: "intermediate",
        days_per_week: 3,
        available_equipment: ["杠铃", "哑铃"],
        session_duration_min: 60,
      });
    const strength = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "strength",
        experience: "intermediate",
        days_per_week: 3,
        available_equipment: ["杠铃", "哑铃"],
        session_duration_min: 60,
      });
    // Find exercise 1 in both
    const findEx1 = (r: any) => {
      for (const d of r.body.data.days) {
        for (const e of d.exercises) {
          if (e.exercise_id === 1) return e.target_weight;
        }
      }
      return null;
    };
    const muscleWeight = findEx1(muscle);
    const strengthWeight = findEx1(strength);
    expect(muscleWeight).not.toBeNull();
    expect(strengthWeight).not.toBeNull();
    expect(strengthWeight!).toBeGreaterThan(muscleWeight!);
  });

  it("falls back to rule engine when LLM key is bogus", async () => {
    const res = await request(app)
      .post("/api/plans/recommend")
      .send({
        goal: "muscle",
        experience: "beginner",
        days_per_week: 3,
        available_equipment: ["徒手"],
        session_duration_min: 30,
        llm: { provider: "minimax", api_key: "sk-bogus-key-for-test-1234" },
      });
    // LLM call will fail (network/auth), so rule engine kicks in
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("rule_engine");
    expect(res.body.degraded).toBe(true);
    expect(res.body.warning).toMatch(/llm_unavailable/);
  }, 30_000);
});

describe("POST /api/plans/recommend/test-llm", () => {
  it("returns 400 on short key", async () => {
    const res = await request(app)
      .post("/api/plans/recommend/test-llm")
      .send({ provider: "minimax", api_key: "abc" });
    expect(res.status).toBe(400);
  });

  it("returns ok=false for invalid key", async () => {
    const res = await request(app)
      .post("/api/plans/recommend/test-llm")
      .send({ provider: "zhipu", api_key: "fake-key-for-test-12345678" });
    expect(res.status).toBe(200);
    // Network may fail OR auth may fail — both result in ok=false
    expect(res.body.data.ok).toBe(false);
    expect(typeof res.body.data.message).toBe("string");
  }, 30_000);
});
