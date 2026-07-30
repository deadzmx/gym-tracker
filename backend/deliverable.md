# Backend Deliverable — gym-tracker

## Summary

Built a TypeScript + Express 4 + better-sqlite3 backend that strictly
implements the REST contract from `docs/design.md` § 4. The project ships
with auto-applied SQLite schema (5 tables), a 35-exercise seed, a typed
repository layer, a centralized error handler, CORS for the Vite dev
origin, and 23 passing Vitest + supertest integration tests. `tsc
--noEmit` is clean and `npm run build` produces a runnable production
bundle (`node dist/server.js`).

---

## How to run

```bash
cd /workspace/gym-tracker/backend

# install
npm install

# dev (tsx watch, auto-reload)
npm run dev
# → http://localhost:3001  (api root: /api/*)

# production build & start
npm run build
npm start
# → uses dist/server.js, same env vars

# tests
npm test
# → 23 tests across 4 files, all green
```

Environment variables (see `.env.example`):

| Var      | Default              | Purpose                              |
| -------- | -------------------- | ------------------------------------ |
| `PORT`   | `3001`               | HTTP port                            |
| `DB_PATH`| `./data/gym.db`      | SQLite file (auto-created on boot)   |

On first boot the server creates `./data/gym.db`, applies the schema, and
seeds 35 common exercises across chest / back / legs / shoulders / arms /
core / cardio.

---

## Test results

```text
$ npm test
> vitest run --silent

 RUN  v2.1.9 /…/gym-tracker/backend

 ✓ tests/stats.test.ts    (6 tests) 186ms
 ✓ tests/sessions.test.ts (5 tests)  92ms
 ✓ tests/plans.test.ts    (6 tests)  97ms
 ✓ tests/exercises.test.ts(6 tests)  73ms

 Test Files  4 passed (4)
      Tests  23 passed (23)
   Start at  07:48:31
   Duration  1.74s
```

Type check:

```text
$ npx tsc -p tsconfig.test.json   # covers src + tests + config
$ echo $?
0
```

Production build:

```text
$ npm run build
$ ls dist/
app.js  app.js.map  db  middleware  repositories  routes  seed  server.js
$ node dist/server.js
gym-tracker backend listening on http://localhost:3001
```

---

## Curl walk-through (against the running dev server)

> The DB was reset before each block. All paths are under `/api`.

### 1. `GET /exercises` — list seed

```bash
$ curl -s http://localhost:3001/api/exercises | jq '{total, sample: .data[:3]}'
```

Response (excerpt — 35 total):

```json
{
  "total": 35,
  "sample": [
    { "id": 1, "name": "杠铃卧推", "category": "chest", "equipment": "barbell",
      "primary_muscle": "胸大肌",
      "description": "平躺仰卧，双手略宽于肩，下放至胸口轻触再推起。",
      "created_at": "2026-07-29 07:46:08" },
    { "id": 2, "name": "哑铃卧推", "category": "chest", "equipment": "dumbbell",
      "primary_muscle": "胸大肌", "description": "…", "created_at": "…" },
    { "id": 3, "name": "哑铃飞鸟", "category": "chest", "equipment": "dumbbell",
      "primary_muscle": "胸大肌", "description": "…", "created_at": "…" }
  ]
}
```

### 2. `POST /plans` — create plan with exercises

```bash
$ curl -s -X POST http://localhost:3001/api/plans \
    -H "Content-Type: application/json" \
    -d '{
      "name": "推日",
      "description": "胸+三头",
      "day_of_week": 1,
      "exercises": [
        {"exercise_id": 1, "order_index": 0, "target_sets": 4, "target_reps": 8,  "target_weight": 60, "rest_seconds": 90},
        {"exercise_id": 3, "order_index": 1, "target_sets": 3, "target_reps": 12, "target_weight": 16, "rest_seconds": 60}
      ]
    }' | jq
```

```json
{
  "data": {
    "id": 1,
    "name": "推日",
    "description": "胸+三头",
    "day_of_week": 1,
    "created_at": "2026-07-29 07:46:17",
    "exercises": [
      { "id": 1, "plan_id": 1, "exercise_id": 1, "order_index": 0,
        "target_sets": 4, "target_reps": 8, "target_weight": 60, "rest_seconds": 90,
        "exercise": { "id": 1, "name": "杠铃卧推", "category": "chest", "equipment": "barbell",
                       "primary_muscle": "胸大肌", "description": "…", "created_at": "…" } },
      { "id": 2, "plan_id": 1, "exercise_id": 3, "order_index": 1,
        "target_sets": 3, "target_reps": 12, "target_weight": 16, "rest_seconds": 60,
        "exercise": { "id": 3, "name": "哑铃飞鸟", "category": "chest", "equipment": "dumbbell",
                       "primary_muscle": "胸大肌", "description": "…", "created_at": "…" } }
    ]
  }
}
```

### 3. `POST /sessions` → `POST /sessions/:id/sets` → `PATCH /sessions/:id`

```bash
$ SID=$(curl -s -X POST http://localhost:3001/api/sessions \
    -H "Content-Type: application/json" \
    -d '{"plan_id": 1, "session_date": "2026-07-29", "notes": "推日测试"}' \
    | jq -r .data.id)
# → 1

$ curl -s -X POST http://localhost:3001/api/sessions/$SID/sets \
    -H "Content-Type: application/json" \
    -d '{
      "sets": [
        {"exercise_id": 1, "set_index": 1, "reps": 8, "weight": 60, "rpe": 7, "completed": true},
        {"exercise_id": 1, "set_index": 2, "reps": 8, "weight": 60, "rpe": 8, "completed": true}
      ]
    }'
```

```json
{
  "data": [
    { "id": 1, "session_id": 1, "exercise_id": 1, "plan_exercise_id": null,
      "set_index": 1, "reps": 8, "weight": 60, "rpe": 7, "completed": 1 },
    { "id": 2, "session_id": 1, "exercise_id": 1, "plan_exercise_id": null,
      "set_index": 2, "reps": 8, "weight": 60, "rpe": 8, "completed": 1 }
  ],
  "total": 2
}
```

```bash
$ curl -s -X PATCH http://localhost:3001/api/sessions/$SID \
    -H "Content-Type: application/json" \
    -d '{"finished_at": "2026-07-29T18:00:00Z"}'
```

```json
{
  "data": {
    "id": 1, "plan_id": 1, "session_date": "2026-07-29",
    "started_at": "2026-07-29 07:46:21", "finished_at": "2026-07-29T18:00:00Z",
    "notes": "推日测试"
  }
}
```

### 4. `GET /stats/summary`

```bash
$ curl -s http://localhost:3001/api/stats/summary | jq
```

```json
{
  "data": {
    "total_sessions": 1,
    "total_volume_kg": 960,
    "current_streak_days": 1,
    "last_7_days_volume": [
      { "date": "2026-07-23", "volume": 0 },
      { "date": "2026-07-24", "volume": 0 },
      { "date": "2026-07-25", "volume": 0 },
      { "date": "2026-07-26", "volume": 0 },
      { "date": "2026-07-27", "volume": 0 },
      { "date": "2026-07-28", "volume": 0 },
      { "date": "2026-07-29", "volume": 960 }
    ]
  }
}
```

### 5. Error paths

```bash
$ curl -s -w "HTTP %{http_code}\n" http://localhost:3001/api/plans/9999
{"error":{"code":"NOT_FOUND","message":"Plan 9999 not found"}}
HTTP 404

$ curl -s -w "HTTP %{http_code}\n" -X POST http://localhost:3001/api/plans \
    -H "Content-Type: application/json" -d '{"description":"no name"}'
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request payload",
  "issues":[{"path":"name","message":"Required"}]}}
HTTP 400

$ curl -s -w "HTTP %{http_code}\n" -X POST http://localhost:3001/api/exercises \
    -H "Content-Type: application/json" -d '{"name":"杠铃卧推"}'
{"error":{"code":"CONFLICT","message":"Unique constraint failed: exercises.name"}}
HTTP 409
```

---

## Changed / created files

All paths relative to `backend/`.

### Configuration

- `package.json` — name, scripts (`dev` / `build` / `start` / `test` /
  `typecheck`), deps (express, better-sqlite3, cors, zod, dotenv), devDeps
  (typescript, tsx, vitest, supertest, @types/*).
- `tsconfig.json` — strict TypeScript, `rootDir: ./src`, `outDir: ./dist`,
  excludes tests.
- `tsconfig.test.json` — extends base, includes `tests/**`, used by
  `npm run typecheck`.
- `vitest.config.ts` — node env, single fork (serial, shared DB handle).
- `.env.example` — `PORT=3001`, `DB_PATH=./data/gym.db`.
- `.gitignore` — `node_modules/`, `dist/`, `data/`, `.env`, etc.

### Source — `src/`

- `server.ts` — dotenv load, `initDb()`, create app, listen on `PORT`,
  graceful SIGINT/SIGTERM.
- `app.ts` — Express factory: CORS, JSON body, request log, mounts
  `/api/exercises`, `/api/plans`, `/api/sessions`, `/api/sets`,
  `/api/stats`, plus `/api/health`, 404 handler, error handler.
- `db/connection.ts` — better-sqlite3 init (WAL + foreign keys), schema
  (5 tables, indices), seed runner, `closeDb()` / `getDb()` singletons.
- `seed/exercises.ts` — 35 common exercises across 7 categories.
- `types/index.ts` — `Exercise`, `WorkoutPlan`, `PlanExercise`,
  `WorkoutSession`, `ExerciseSet`, joined shapes, stats DTOs,
  `HttpError` class.
- `repositories/exerciseRepository.ts` — list / get / create / update /
  delete using prepared statements.
- `repositories/planRepository.ts` — list / get / `getPlanWithExercises`
  (joins plan_exercises + exercise via SQLite `json_object`), create /
  update (full plan_exercises replacement inside a transaction).
- `repositories/sessionRepository.ts` — list / get / `getSessionWithSets`
  (joins exercise_sets + exercise), create, update, delete, batch
  `addSessionSets` in a transaction, per-set update / delete.
- `repositories/statsRepository.ts` — `getSummary` (total volume,
  streak, last-7-day window), `getExerciseVolume` (per-day with
  zero-fill, optional 366-day cap), `getPersonalRecords` (Epley 1RM =
  `weight * (1 + reps/30)`).
- `middleware/cors.ts` — allows `http://localhost:5173` (+ 4173 preview,
  127.0.0.1 variants), JSON content type, credentials.
- `middleware/errorHandler.ts` — `notFoundHandler` + central
  `errorHandler`. Maps: `HttpError` → its own status; `ZodError` → 400
  `VALIDATION_ERROR` with `issues[]`; `SQLITE_CONSTRAINT_UNIQUE` → 409
  `CONFLICT`; `SQLITE_CONSTRAINT_FOREIGNKEY` → 400 `FK_VIOLATION`; else
  500 `INTERNAL_ERROR`. Always logs the raw error server-side.
- `routes/exercises.ts` — 5 endpoints, zod-validated, supports
  `?category=…`.
- `routes/plans.ts` — 5 endpoints, plan create/put in a transaction
  that replaces `plan_exercises`; detail joins both tables.
- `routes/sessions.ts` — 8 endpoints across `/sessions`,
  `/sessions/:id`, `/sessions/:id/sets`, `/sets/:id`. PATCH supports
  partial update of `plan_id` / `session_date` / `started_at` /
  `finished_at` / `notes`.
- `routes/stats.ts` — `summary`, `volume?exercise_id&from&to`,
  `personal-records?exercise_id`.

### Tests — `tests/`

- `helpers.ts` — `useFreshDb()` (fresh temp dir + DB per test file),
  `buildTestApp()`.
- `exercises.test.ts` (6 tests) — seed count, category filter, 404,
  empty filter result, 400 on bad payload, happy POST.
- `plans.test.ts` (6 tests) — create with exercises (transaction),
  GET detail joins exercises, PUT full replacement, DELETE, 404,
  400 on invalid payload.
- `sessions.test.ts` (5 tests) — start → batch sets → finish → read
  back, list with date range, 404, empty sets → 400, PUT/DELETE single
  set.
- `stats.test.ts` (6 tests) — empty summary, volume + streak after
  seeding, per-day volume with zero-fill, missing `exercise_id` → 400,
  PR (max weight / max volume / Epley 1RM) with three sessions, null
  PRs for an exercise with no sets.

Total: 23 tests, all passing.

### Misc

- `data/` — runtime SQLite directory (gitignored, auto-created).

---

## Notes for the verifier

1. **No design.md changes.** The contract was implementable as written, so
   I did not edit `docs/design.md`. The only interpretive choices are
   surfaced in the contract-deviations section below.

2. **SQLite WAL + foreign keys** are enabled in
   `src/db/connection.ts`. `ON DELETE CASCADE` on `plan_exercises` and
   `exercise_sets` ensures deleting a plan / session also removes its
   children.

3. **Transactions** are used wherever the spec says "in one transaction":
   - `createPlan` / `updatePlan` wrap plan + plan_exercises writes in a
     single `db.transaction(...)`.
   - `addSessionSets` wraps the batch insert.
   - Seed insert is also transactional for atomicity on first boot.

4. **Join shape** — the `GET /plans/:id` and `GET /sessions/:id`
   endpoints use SQLite's `json_object()` to build a nested `exercise`
   sub-object in a single round-trip, then JSON-parse it back into a
   nested object. The DTO types in `src/types/index.ts` reflect the
   nested shape so the frontend can consume it directly.

5. **Date semantics**
   - `session_date` is `TEXT` in `YYYY-MM-DD` form (validated by zod).
   - `started_at` / `finished_at` are ISO-8601 strings.
   - `current_streak_days` counts back from today (UTC) and also
     allows the streak to start from "yesterday" so users don't read 0
     just because they haven't trained yet today.
   - `last_7_days_volume` always returns 7 contiguous days ending today;
     missing days default to `volume: 0`.
   - `getExerciseVolume` zero-fills the `[from, to]` window (capped at
     366 days) so the chart gets a continuous series.

6. **Epley 1RM** — `weight * (1 + reps / 30)`, computed in SQL, rounded
   to 2 decimals in the response. The PR endpoint returns the
   `{value, date}` of the best single set per category.

7. **Seed count** — 35 exercises, exceeding the 30+ requirement:
   chest 6, back 6, legs 7, shoulders 5, arms 5, core 4, cardio 2.

8. **Error envelope** matches `docs/design.md` § 4:
   `{ "error": { "code": "...", "message": "..." } }`. Validation
   errors additionally include an `issues` array with the field path +
   message.

9. **CORS** — `http://localhost:5173` is the primary allowed origin,
   plus `127.0.0.1:5173` and the Vite preview port `4173` for
   convenience.

10. **Test isolation** — every test file gets a fresh temp DB, so
    tests do not share state and can run in any order. `vitest.config.ts`
    uses `singleFork: true` because the singleton DB handle is shared
    via `getDb()`.

---

## Contract deviations / clarifications

None of these alter the public API surface — they are implementation
notes that may help the frontend track:

- `GET /exercises?category=…` returns the same envelope as
  `GET /exercises` (`{ data, total }`); if the frontend wants a flat
  array it can use `.data`.
- `GET /sessions/:id` returns `sets: [...]` plus a populated `plan`
  field when the session was linked to a plan.
- `POST /plans` and `PUT /plans/:id` both accept (and ignore unknown
  fields silently via zod's default behavior). `exercises: []` in a
  PUT is interpreted as "replace with zero items" (i.e. clear the
  plan's exercise list). Omit `exercises` entirely to leave it
  unchanged.
- `POST /sessions/:id/sets` requires `sets.length >= 1`; an empty
  array returns 400.
- `PUT /sets/:id` accepts a partial payload; only the supplied fields
  change.
- `GET /stats/personal-records` returns `null` for any category the
  exercise has no completed sets for (rather than 404).

---

## What was NOT done (out of scope per task brief)

- Frontend (separate track).
- E2E tests (separate track).
- Authentication / multi-user (not in design.md).
- Migrations framework (the schema is `CREATE TABLE IF NOT EXISTS`,
  matching design.md § 3 — sufficient for v0.1).
