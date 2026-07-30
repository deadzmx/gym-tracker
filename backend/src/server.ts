import "dotenv/config";
import { createApp } from "./app";
import { closeDb, getDb, initDb } from "./db/connection";

const PORT = Number(process.env.PORT ?? 3001);

// Ensure the DB is initialized before the server starts handling requests
// so that the seed runs synchronously.
initDb();

const app = createApp();
const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`gym-tracker backend listening on http://localhost:${PORT}`);
  // Touching getDb() here ensures the seed has actually run.
  getDb();
});

function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // Force-exit if graceful shutdown takes too long.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
