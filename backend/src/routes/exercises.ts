import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  createExercise,
  deleteExercise,
  getExercise,
  listExercises,
  updateExercise,
} from "../repositories/exerciseRepository";
import { CATEGORIES, EQUIPMENT, HttpError } from "../types";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(CATEGORIES).optional().nullable(),
  equipment: z.enum(EQUIPMENT).optional().nullable(),
  primary_muscle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

function parseId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid id");
  }
  return id;
}

router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    const data = listExercises(category);
    res.json({ data, total: data.length });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const exercise = getExercise(id);
    if (!exercise) {
      throw new HttpError(404, "NOT_FOUND", `Exercise ${id} not found`);
    }
    res.json({ data: exercise });
  } catch (e) {
    next(e);
  }
});

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.parse(req.body);
    const created = createExercise(parsed);
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const parsed = updateSchema.parse(req.body);
    const updated = updateExercise(id, parsed);
    if (!updated) {
      throw new HttpError(404, "NOT_FOUND", `Exercise ${id} not found`);
    }
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req);
    const ok = deleteExercise(id);
    if (!ok) {
      throw new HttpError(404, "NOT_FOUND", `Exercise ${id} not found`);
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
