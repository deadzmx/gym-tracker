import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../types";

// 404 handler — only runs when no route matched.
export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Resource not found" },
  });
}

// Centralized error handler. Maps:
//  - HttpError (with status + code) -> its own status
//  - ZodError -> 400 VALIDATION_ERROR with the issues
//  - SQLite UNIQUE constraint failure -> 409 CONFLICT
//  - SQLite foreign key failure -> 400 FK_VIOLATION
//  - anything else -> 500 INTERNAL_ERROR
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Always log the raw error server-side for debugging.
  // eslint-disable-next-line no-console
  console.error("[errorHandler]", err);

  if (err instanceof HttpError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.status >= 500) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
      return;
    }
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  const msg = (err as Error)?.message ?? "";
  // better-sqlite3 surfaces errors with .code = 'SQLITE_CONSTRAINT_UNIQUE'
  // and .code = 'SQLITE_CONSTRAINT_FOREIGNKEY'.
  const sqliteCode = (err as { code?: string })?.code;
  if (sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") {
    res.status(409).json({
      error: { code: "CONFLICT", message: extractUniqueMessage(msg) },
    });
    return;
  }
  if (sqliteCode === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    res.status(400).json({
      error: {
        code: "FK_VIOLATION",
        message: "Referenced resource does not exist",
      },
    });
    return;
  }

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Server error" },
  });
};

function extractUniqueMessage(msg: string): string {
  // Default to a generic message; the column is usually present in the
  // SQLite error string and we surface a short hint when possible.
  const match = /UNIQUE constraint failed: (\S+)/.exec(msg);
  if (match) {
    return `Unique constraint failed: ${match[1]}`;
  }
  return "Unique constraint failed";
}
