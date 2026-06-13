import pino from "pino";
import { isDevelopment } from "../config";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  // Structured JSON in production — compatible with Datadog, CloudWatch, etc.
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: "express-saas" },
});

export type Logger = typeof logger;
