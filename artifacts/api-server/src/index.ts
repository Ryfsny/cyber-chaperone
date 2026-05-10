import app from "./app";
import { logger } from "./lib/logger";
import { startCheckpointScheduler } from "./checkpoint-scheduler.js";
import { startWeeklyDigest } from "./weekly-digest.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startCheckpointScheduler(logger);
  startWeeklyDigest(logger);
  startKeepAlive(port);
});

// ── Keep-alive self-ping ──────────────────────────────────────────────────────
// Replit terminates idle containers after ~40 min of no traffic.
// This pings the health endpoint every 14 minutes to prevent sleep.
function startKeepAlive(serverPort: number): void {
  const INTERVAL_MS = 14 * 60 * 1000;
  setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:${serverPort}/api/healthz`);
      logger.info({ status: res.status }, "Keep-alive ping");
    } catch (err) {
      logger.warn({ err }, "Keep-alive ping failed");
    }
  }, INTERVAL_MS);
  logger.info({ intervalMinutes: 14 }, "Keep-alive scheduler started");
}
