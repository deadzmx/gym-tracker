import { beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { initDb, closeDb } from "../src/db/connection";
import { createApp } from "../src/app";
import type { Express } from "express";

let tmpDir: string | null = null;

export function setupTestDb(): void {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gym-test-"));
  const dbPath = path.join(tmpDir, "test.db");
  process.env.DB_PATH = dbPath;
  // Force re-init by closing any existing handle.
  closeDb();
  initDb(dbPath);
}

export function teardownTestDb(): void {
  closeDb();
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  tmpDir = null;
}

export function buildTestApp(): Express {
  return createApp();
}

// Standard beforeEach/afterEach wrappers for the common pattern.
export function useFreshDb(): void {
  beforeEach(() => {
    setupTestDb();
  });
  afterEach(() => {
    teardownTestDb();
  });
}
