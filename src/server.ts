import * as Sentry from "@sentry/node";
import { createApp } from "./app";
import { config } from "./config";
import { project } from "./config/project";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

// ── Sentry ────────────────────────────────────────────────────────────────────
if (config.SENTRY_DSN) {
  Sentry.init({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV });
  logger.info("sentry.initialized");
}

// ── Start ─────────────────────────────────────────────────────────────────────
const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, `${config.APP_NAME} started`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info({ signal }, "shutdown.initiated");

  server.close(async () => {
    try {
      await prisma.$disconnect();
      await redis.quit();
      logger.info("shutdown.complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "shutdown.error");
      process.exit(1);
    }
  });

  // Force kill after timeout
  setTimeout(() => {
    logger.error("shutdown.forced");
    process.exit(1);
  }, project.gracefulShutdownTimeoutMs);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException");
  process.exit(1);
});

export default server;
