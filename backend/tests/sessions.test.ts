import { describe, it, expect } from "vitest";
import request from "supertest";
import { useFreshDb, buildTestApp } from "./helpers";

describe("sessions API", () => {
  useFreshDb();
  const app = buildTestApp();

  async function getExerciseId(name: string): Promise<number> {
    const res = await request(app).get("/api/exercises");
    const found = res.body.data.find((e: { name: string }) => e.name === name);
    if (!found) throw new Error(`Exercise not found in seed: ${name}`);
    return found.id as number;
  }

  it("starts a session, records sets, finishes, and reads back", async () => {
    const benchId = await getExerciseId("杠铃卧推");

    // 1. Start a session
    const start = await request(app)
      .post("/api/sessions")
      .send({ session_date: "2024-07-29" });
    expect(start.status).toBe(201);
    const sessionId = start.body.data.id as number;
    expect(sessionId).toBeGreaterThan(0);
    expect(start.body.data.started_at).toBeTruthy();

    // 2. Add sets in a batch
    const add = await request(app)
      .post(`/api/sessions/${sessionId}/sets`)
      .send({
        sets: [
          {
            exercise_id: benchId,
            set_index: 1,
            reps: 8,
            weight: 60,
            rpe: 7,
            completed: true,
          },
          {
            exercise_id: benchId,
            set_index: 2,
            reps: 8,
            weight: 60,
            rpe: 8,
            completed: true,
          },
        ],
      });
    expect(add.status).toBe(201);
    expect(add.body.data).toHaveLength(2);

    // 3. Finish the session
    const finish = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .send({ finished_at: "2024-07-29T18:00:00Z", notes: "推日完成" });
    expect(finish.status).toBe(200);
    expect(finish.body.data.finished_at).toBe("2024-07-29T18:00:00Z");
    expect(finish.body.data.notes).toBe("推日完成");

    // 4. Read back the session with sets joined
    const detail = await request(app).get(`/api/sessions/${sessionId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.sets).toHaveLength(2);
    expect(detail.body.data.sets[0].exercise.name).toBe("杠铃卧推");
    expect(detail.body.data.sets[0].weight).toBe(60);
  });

  it("lists sessions with date filter", async () => {
    for (const d of ["2024-07-01", "2024-07-15", "2024-08-01"]) {
      await request(app)
        .post("/api/sessions")
        .send({ session_date: d });
    }
    const res = await request(app)
      .get("/api/sessions")
      .query({ from: "2024-07-10", to: "2024-07-31" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].session_date).toBe("2024-07-15");
  });

  it("returns 404 for missing session", async () => {
    const res = await request(app).get("/api/sessions/9999");
    expect(res.status).toBe(404);
  });

  it("rejects empty sets array", async () => {
    const start = await request(app)
      .post("/api/sessions")
      .send({ session_date: "2024-07-29" });
    const sessionId = start.body.data.id as number;
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/sets`)
      .send({ sets: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates and deletes a single set", async () => {
    const benchId = await getExerciseId("杠铃卧推");
    const start = await request(app)
      .post("/api/sessions")
      .send({ session_date: "2024-07-29" });
    const sessionId = start.body.data.id as number;
    const add = await request(app)
      .post(`/api/sessions/${sessionId}/sets`)
      .send({
        sets: [
          { exercise_id: benchId, set_index: 1, reps: 5, weight: 40 },
        ],
      });
    const setId = add.body.data[0].id as number;

    const upd = await request(app)
      .put(`/api/sets/${setId}`)
      .send({ reps: 6, weight: 42.5 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.reps).toBe(6);
    expect(upd.body.data.weight).toBe(42.5);

    const del = await request(app).delete(`/api/sets/${setId}`);
    expect(del.status).toBe(204);

    const detail = await request(app).get(`/api/sessions/${sessionId}`);
    expect(detail.body.data.sets).toHaveLength(0);
  });
});
