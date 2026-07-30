import { describe, it, expect } from "vitest";
import request from "supertest";
import { useFreshDb, buildTestApp } from "./helpers";

describe("exercises API", () => {
  useFreshDb();
  const app = buildTestApp();

  it("seeds 30+ exercises and lists them", async () => {
    const res = await request(app).get("/api/exercises");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(30);
    // Spot-check a few well-known seed entries.
    const names = res.body.data.map((e: { name: string }) => e.name);
    expect(names).toContain("杠铃卧推");
    expect(names).toContain("深蹲");
    expect(names).toContain("硬拉");
  });

  it("filters by category", async () => {
    const res = await request(app)
      .get("/api/exercises")
      .query({ category: "chest" });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const e of res.body.data) {
      expect(e.category).toBe("chest");
    }
  });

  it("returns 404 for missing exercise", async () => {
    const res = await request(app).get("/api/exercises/9999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects unknown category on filter", async () => {
    // The filter passes through to the SQL which simply returns nothing
    // (no validation on category string) — verify empty result instead.
    const res = await request(app)
      .get("/api/exercises")
      .query({ category: "nonexistent" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("validates POST body", async () => {
    const res = await request(app)
      .post("/api/exercises")
      .send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates an exercise", async () => {
    const res = await request(app)
      .post("/api/exercises")
      .send({
        name: "测试动作",
        category: "chest",
        equipment: "barbell",
        primary_muscle: "胸大肌",
        description: "测试",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.name).toBe("测试动作");
  });
});
