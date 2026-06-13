import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";

import { config, isProduction } from "./config";
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
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    })
  );

  // ── Raw body for Paystack webhooks (must come before json middleware) ─
  app.use(
    "/api/v1/billing/webhooks/paystack",
    express.raw({ type: "application/json" })
  );

  // ── Body parsing ────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request ID ──────────────────────────────────────────────────────
  app.use(requestId);

  // ── Structured HTTP logging ─────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) =>
          ["/api/v1/health", "/api/v1/ready"].includes(req.url ?? ""),
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
      message: { error: "Too many requests. Please slow down." },
    })
  );

  // Stricter limits on auth endpoints
  app.use(
    "/api/v1/auth/login",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })
  );
  app.use(
    "/api/v1/auth/register",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false })
  );

  // ── API routes ──────────────────────────────────────────────────────
  app.use("/api/v1", v1Router);

  // ── 404 handler ─────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // ── Global error handler (must be last) ────────────────────────────
  app.use(errorHandler);

  return app;
}
