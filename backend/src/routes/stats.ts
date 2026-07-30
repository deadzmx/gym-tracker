import { Router, type Request, type Response, type NextFunction } from "express";
import {
  getCalendar,
  getExerciseVolume,
  getPersonalRecords,
  getSummary,
} from "../repositories/statsRepository";
import { HttpError } from "../types";

const router = Router();

const dateString = /^\d{4}-\d{2}-\d{2}$/;

router.get("/summary", (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: getSummary() });
  } catch (e) {
    next(e);
  }
});

router.get("/volume", (req: Request, res: Response, next: NextFunction) => {
  try {
    const exerciseId = Number(req.query.exercise_id);
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      throw new HttpError(400, "BAD_REQUEST", "exercise_id is required");
    }
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    if (from && !dateString.test(from)) {
      throw new HttpError(400, "BAD_REQUEST", "from must be YYYY-MM-DD");
    }
    if (to && !dateString.test(to)) {
      throw new HttpError(400, "BAD_REQUEST", "to must be YYYY-MM-DD");
    }
    const data = getExerciseVolume(exerciseId, from, to);
    res.json({ data, total: data.length });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/personal-records",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const exerciseId = Number(req.query.exercise_id);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
        throw new HttpError(400, "BAD_REQUEST", "exercise_id is required");
      }
      res.json({ data: getPersonalRecords(exerciseId) });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/calendar", (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const defaultFrom = new Date(today);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 83); // 12 weeks back
    const fromStr = defaultFrom.toISOString().slice(0, 10);

    const from = typeof req.query.from === "string" ? req.query.from : fromStr;
    const to = typeof req.query.to === "string" ? req.query.to : todayStr;

    if (!dateString.test(from)) {
      throw new HttpError(400, "BAD_REQUEST", "from must be YYYY-MM-DD");
    }
    if (!dateString.test(to)) {
      throw new HttpError(400, "BAD_REQUEST", "to must be YYYY-MM-DD");
    }
    const days = (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000;
    if (days < 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "from 不能晚于 to");
    }
    if (days > 366) {
      throw new HttpError(400, "VALIDATION_ERROR", "日期范围不能超过 366 天");
    }

    const data = getCalendar(from, to);
    res.json({ data, total: data.length });
  } catch (e) {
    next(e);
  }
});

export default router;
