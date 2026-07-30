import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  addSessionSets,
  createSession,
  deleteSession,
  deleteSet,
  getSession,
  getSessionSets,
  getSessionWithSets,
  listSessions,
  updateSession,
  updateSet,
} from "../repositories/sessionRepository";
import { HttpError } from "../types";

// Router for /sessions and /sessions/:sessionId/sets.
const router = Router();

// Router for /sets/:id.
const setsRouter = Router();

function parseId(req: Request, name = "id"): number {
  const raw = req.params[name];
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "BAD_REQUEST", `Invalid ${name}`);
  }
  return id;
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const createSessionSchema = z.object({
  plan_id: z.number().int().positive().optional().nullable(),
  session_date: dateString,
  notes: z.string().optional().nullable(),
});

const updateSessionSchema = z.object({
  plan_id: z.number().int().positive().optional().nullable(),
  session_date: dateString.optional(),
  started_at: z.string().optional(),
  finished_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const setInputSchema = z.object({
  exercise_id: z.number().int().positive(),
  plan_exercise_id: z.number().int().positive().optional().nullable(),
  set_index: z.number().int().nonnegative().optional().nullable(),
  reps: z.number().int().nonnegative().optional().nullable(),
  weight: z.number().nonnegative().optional().nullable(),
  rpe: z.number().min(0).max(10).optional().nullable(),
  completed: z.boolean().optional().nullable(),
});

const addSetsSchema = z.object({
  sets: z.array(setInputSchema).min(1),
});

const updateSetSchema = setInputSchema.partial();

// ----- /sessions -----

router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    let limit: number | undefined;
    if (typeof req.query.limit === "string") {
      const n = Number(req.query.limit);
      if (!Number.isInteger(n) || n <= 0 || n > 500) {
        throw new HttpError(400, "BAD_REQUEST", "Invalid limit");
      }
      limit = n;
    }
    const data = listSessions({ from, to, limit });
    res.json({ data, total: data.length });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const session = getSessionWithSets(id);
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", `Session ${id} not found`);
    }
    res.json({ data: session });
  } catch (e) {
    next(e);
  }
});

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSessionSchema.parse(req.body);
    const created = createSession(parsed);
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const parsed = updateSessionSchema.parse(req.body);
    const updated = updateSession(id, parsed);
    if (!updated) {
      throw new HttpError(404, "NOT_FOUND", `Session ${id} not found`);
    }
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const ok = deleteSession(id);
    if (!ok) {
      throw new HttpError(404, "NOT_FOUND", `Session ${id} not found`);
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// ----- /sessions/:sessionId/sets -----

router.get(
  "/:sessionId/sets",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = parseId(req, "sessionId");
      const session = getSession(sessionId);
      if (!session) {
        throw new HttpError(404, "NOT_FOUND", `Session ${sessionId} not found`);
      }
      const data = getSessionSets(sessionId);
      res.json({ data, total: data.length });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/:sessionId/sets",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = parseId(req, "sessionId");
      const session = getSession(sessionId);
      if (!session) {
        throw new HttpError(404, "NOT_FOUND", `Session ${sessionId} not found`);
      }
      const parsed = addSetsSchema.parse(req.body);
      const created = addSessionSets(sessionId, parsed.sets);
      res.status(201).json({ data: created, total: created.length });
    } catch (e) {
      next(e);
    }
  }
);

// ----- /sets/:id -----

setsRouter.put("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const parsed = updateSetSchema.parse(req.body);
    const updated = updateSet(id, parsed);
    if (!updated) {
      throw new HttpError(404, "NOT_FOUND", `Set ${id} not found`);
    }
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

setsRouter.delete(
  "/:id",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req);
      const ok = deleteSet(id);
      if (!ok) {
        throw new HttpError(404, "NOT_FOUND", `Set ${id} not found`);
      }
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export { router as sessionsRouter, setsRouter };
