import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { project } from "./config/project";
import { logger } from "./lib/logger";
import { requestId } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import v1Router from "./routes/v1";

export function createApp() {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.FRONTEND_URL,
      credentials: true,
      methods: project.cors.methods,
      allowedHeaders: project.cors.allowedHeaders,
    })
  );

  // ── Raw body for Paystack webhooks (must come before json middleware) ─
  app.use(`${project.apiPrefix}/billing/webhooks/paystack`, express.raw({ type: "application/json" }));

  // ── Body parsing ────────────────────────────────────────────────────
  app.use(express.json({ limit: project.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request ID ──────────────────────────────────────────────────────
  app.use(requestId);

  // ── Structured HTTP logging ─────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => project.healthCheckPaths.includes(req.url ?? ""),
      },
      customLogLevel: (_req, res) => {
        if (res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    })
  );

  // ── Rate limiting ───────────────────────────────────────────────────
  app.use(
    "/api/",
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        message: "Too many requests. Please slow down.",
        code: "RATE_LIMITED",
        statusCode: 429,
      },
    })
  );

  // Stricter limits on auth endpoints
  app.use(
    `${project.apiPrefix}/auth/login`,
    rateLimit({ windowMs: project.rateLimit.login.windowMs, max: project.rateLimit.login.max, standardHeaders: true, legacyHeaders: false })
  );
  app.use(
    `${project.apiPrefix}/auth/register`,
    rateLimit({ windowMs: project.rateLimit.register.windowMs, max: project.rateLimit.register.max, standardHeaders: true, legacyHeaders: false })
  );

  // ── API routes ──────────────────────────────────────────────────────
  app.use(project.apiPrefix, v1Router);

  // ── 404 handler ─────────────────────────────────────────────────────
  app.use((_req, res) => {
    res
      .status(404)
      .json({ message: "Route not found", code: "RESOURCE_NOT_FOUND", statusCode: 404 });
  });

  // ── Global error handler (must be last) ────────────────────────────
  app.use(errorHandler);

  return app;
}
