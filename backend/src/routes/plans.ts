import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  createPlan,
  deletePlan,
  getPlan,
  getPlanWithExercises,
  listPlans,
  updatePlan,
} from "../repositories/planRepository";
import { HttpError } from "../types";

const router = Router();

const dayOfWeek = z
  .number()
  .int()
  .min(0)
  .max(6)
  .optional()
  .nullable();

const planExerciseSchema = z.object({
  exercise_id: z.number().int().positive(),
  order_index: z.number().int().nonnegative().optional().nullable(),
  target_sets: z.number().int().positive().optional().nullable(),
  target_reps: z.number().int().positive().optional().nullable(),
  target_weight: z.number().nonnegative().optional().nullable(),
  rest_seconds: z.number().int().nonnegative().optional().nullable(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  day_of_week: dayOfWeek,
  exercises: z.array(planExerciseSchema).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  day_of_week: dayOfWeek,
  exercises: z.array(planExerciseSchema).optional(),
});

function parseId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid id");
  }
  return id;
}

router.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = listPlans();
    res.json({ data, total: data.length });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const plan = getPlanWithExercises(id);
    if (!plan) {
      throw new HttpError(404, "NOT_FOUND", `Plan ${id} not found`);
    }
    res.json({ data: plan });
  } catch (e) {
    next(e);
  }
});

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.parse(req.body);
    const created = createPlan(parsed);
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const parsed = updateSchema.parse(req.body);
    const updated = updatePlan(id, parsed);
    if (!updated) {
      throw new HttpError(404, "NOT_FOUND", `Plan ${id} not found`);
    }
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const ok = deletePlan(id);
    if (!ok) {
      throw new HttpError(404, "NOT_FOUND", `Plan ${id} not found`);
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
