import express, { type Express, type Request, type Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { corsMiddleware } from "./middleware/cors";
import exercisesRouter from "./routes/exercises";
import plansRouter from "./routes/plans";
import { sessionsRouter, setsRouter } from "./routes/sessions";
import statsRouter from "./routes/stats";
import recommendRouter from "./routes/recommend";

// Resolve the frontend's static files directory (set by unified Dockerfile)
const STATIC_DIR =
  process.env.STATIC_DIR ??
  path.resolve(__dirname, "..", "..", "frontend", "dist");

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

  // ─── Static frontend (only if built) ───
  // When the unified Docker image is built, STATIC_DIR contains
  // the frontend's `dist/` output. In dev, this dir may not exist.
  if (fs.existsSync(STATIC_DIR)) {
    // Cache static assets aggressively
    app.use(
      "/assets",
      express.static(path.join(STATIC_DIR, "assets"), {
        maxAge: "1y",
        immutable: true,
      }),
    );

    // SPA fallback — for any non-API route, serve index.html
    // so React Router can handle client-side routing.
    app.get(/^\/(?!api).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(STATIC_DIR, "index.html"));
    });
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[info] No static files at ${STATIC_DIR} — running in API-only mode`,
    );
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
