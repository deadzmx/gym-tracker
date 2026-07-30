// AI plan recommendation routes.

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { listExercises } from "../repositories/exerciseRepository";
import { recommend as recommendRule, type PrMap } from "../services/recommend";
import { callLlm, testLlmConnection } from "../services/llm";
import { listAllPersonalRecords } from "../repositories/statsRepository";
import { HttpError, type RecommendOutput } from "../types";

const router = Router();

const goalSchema = z.enum(["muscle", "fat_loss", "strength", "balanced"]);
const experienceSchema = z.enum(["beginner", "intermediate", "advanced"]);
const daysSchema = z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);
const durationSchema = z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75), z.literal(90)]);
const equipmentSchema = z.enum(["barbell", "dumbbell", "machine", "cable", "bodyweight"]);
const categorySchema = z.enum(["chest", "back", "legs", "shoulders", "arms", "core", "cardio"]);
const providerSchema = z.enum(["minimax", "zhipu"]);

const recommendSchema = z.object({
  goal: goalSchema,
  experience: experienceSchema,
  days_per_week: daysSchema,
  available_equipment: z.array(equipmentSchema).min(1, "至少选择一种器械"),
  session_duration_min: durationSchema,
  focus_areas: z.array(categorySchema).optional(),
  notes: z.string().max(500).optional(),
  llm: z
    .object({
      provider: providerSchema,
      api_key: z.string().min(8, "API key 太短"),
    })
    .optional(),
});

router.post("/recommend", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = recommendSchema.safeParse(req.body);
    if (!parse.success) {
      throw new HttpError(400, "VALIDATION_ERROR", parse.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "));
    }
    const input = parse.data;

    const pool = listExercises();
    if (pool.length === 0) {
      throw new HttpError(503, "NO_EXERCISES", "动作库为空,请先 seed 数据");
    }

    // Build PR map: exercise_id -> estimated 1RM (use estimated_1rm if available, else max_weight)
    const allPrs = listAllPersonalRecords();
    const prMap: PrMap = {};
    for (const { exercise_id, pr } of allPrs) {
      const oneRm = pr.estimated_1rm?.value ?? pr.max_weight?.value ?? 0;
      if (oneRm > 0) {
        prMap[exercise_id] = oneRm;
      }
    }

    // 1. Try LLM if user provided key
    if (input.llm) {
      try {
        const llmOut = await callLlm(input.llm.provider, input.llm.api_key, input, pool, prMap);
        res.json({
          data: llmOut,
          degraded: false,
          warning: null,
        });
        return;
      } catch (err) {
        // LLM failed — fall through to rule engine
        // eslint-disable-next-line no-console
        console.warn(`[recommend] LLM failed, falling back: ${(err as Error).message}`);
        const ruleOut: RecommendOutput = recommendRule(input, pool, prMap);
        res.json({
          data: ruleOut,
          degraded: true,
          warning: `llm_unavailable: ${(err as Error).message}`,
        });
        return;
      }
    }

    // 2. No key — rule engine
    const ruleOut = recommendRule(input, pool, prMap);
    res.json({
      data: ruleOut,
      degraded: true,
      warning: "no_llm_key",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/recommend/test-llm", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      provider: providerSchema,
      api_key: z.string().min(8, "API key 太短"),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      throw new HttpError(400, "VALIDATION_ERROR", parse.error.errors.map((e) => e.message).join("; "));
    }
    const result = await testLlmConnection(parse.data.provider, parse.data.api_key);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
