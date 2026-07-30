import { describe, it, expect } from "vitest";
import request from "supertest";
import { useFreshDb, buildTestApp } from "./helpers";

describe("plans API", () => {
  useFreshDb();
  const app = buildTestApp();

  async function getExerciseId(name: string): Promise<number> {
    const res = await request(app)
      .get("/api/exercises")
      .query({ category: name === "any" ? undefined : undefined });
    const found = res.body.data.find((e: { name: string }) => e.name === name);
    if (!found) throw new Error(`Exercise not found in seed: ${name}`);
    return found.id as number;
  }

  it("creates a plan with exercises atomically", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    const flyId = await getExerciseId("哑铃飞鸟");

    const res = await request(app)
      .post("/api/plans")
      .send({
        name: "推日",
        description: "胸+三头",
        day_of_week: 1,
        exercises: [
          {
            exercise_id: benchId,
            order_index: 0,
            target_sets: 4,
            target_reps: 8,
            target_weight: 60,
            rest_seconds: 90,
          },
          {
            exercise_id: flyId,
            order_index: 1,
            target_sets: 3,
            target_reps: 12,
            target_weight: 16,
            rest_seconds: 60,
          },
        ],
      });
    expect(res.status).toBe(201);
    const plan = res.body.data;
    expect(plan.id).toBeGreaterThan(0);
    expect(plan.name).toBe("推日");
    expect(Array.isArray(plan.exercises)).toBe(true);
    expect(plan.exercises).toHaveLength(2);
    expect(plan.exercises[0].exercise).toBeTruthy();
    expect(plan.exercises[0].exercise.name).toBe("杠铃卧推");
    expect(plan.exercises[0].target_sets).toBe(4);
  });

  it("GET /plans/:id returns the plan with joined exercises", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    const create = await request(app)
      .post("/api/plans")
      .send({
        name: "推日 v2",
        exercises: [{ exercise_id: benchId, target_sets: 3 }],
      });
    const id = create.body.data.id;
    const res = await request(app).get(`/api/plans/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.exercises).toHaveLength(1);
    expect(res.body.data.exercises[0].exercise.name).toBe("杠铃卧推");
  });

  it("PUT /plans/:id replaces plan_exercises atomically", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    const flyId = await getExerciseId("哑铃飞鸟");
    const squatId = await getExerciseId("深蹲");

    const create = await request(app)
      .post("/api/plans")
      .send({
        name: "全替换测试",
        exercises: [
          { exercise_id: benchId, target_sets: 4 },
          { exercise_id: flyId, target_sets: 3 },
        ],
      });
    const id = create.body.data.id;
    expect(create.body.data.exercises).toHaveLength(2);

    const put = await request(app)
      .put(`/api/plans/${id}`)
      .send({
        name: "全替换测试 v2",
        exercises: [
          { exercise_id: squatId, order_index: 0, target_sets: 5 },
        ],
      });
    expect(put.status).toBe(200);
    expect(put.body.data.exercises).toHaveLength(1);
    expect(put.body.data.exercises[0].exercise.name).toBe("深蹲");
    expect(put.body.data.name).toBe("全替换测试 v2");
  });

  it("DELETE /plans/:id removes the plan", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    const create = await request(app)
      .post("/api/plans")
      .send({ name: "待删除", exercises: [{ exercise_id: benchId }] });
    const id = create.body.data.id;

    const del = await request(app).delete(`/api/plans/${id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/plans/${id}`);
    expect(get.status).toBe(404);
  });

  it("returns 404 for missing plan", async () => {
    const res = await request(app).get("/api/plans/9999");
    expect(res.status).toBe(404);
  });

  it("rejects invalid payload", async () => {
    const res = await request(app)
      .post("/api/plans")
      .send({ description: "no name" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
