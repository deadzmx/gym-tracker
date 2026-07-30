import express, { type Express, type Request, type Response } from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { corsMiddleware } from "./middleware/cors";
import exercisesRouter from "./routes/exercises";
import plansRouter from "./routes/plans";
import { sessionsRouter, setsRouter } from "./routes/sessions";
import statsRouter from "./routes/stats";
import recommendRouter from "./routes/recommend";

export function createApp(): Express {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));

  // Lightweight request log for dev visibility.
  app.use((req: Request, _res: Response, next) => {
    // eslint-disable-next-line no-console
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/exercises", exercisesRouter);
  app.use("/api/plans", recommendRouter); // /recommend, /recommend/test-llm (must come before plansRouter's /:id)
  app.use("/api/plans", plansRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/sets", setsRouter);
  app.use("/api/stats", statsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
