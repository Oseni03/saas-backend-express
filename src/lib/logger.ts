import pino from "pino";
import { isDevelopment } from "../config";
import { project } from "../config/project";

export const logger = pino({
  level: isDevelopment ? project.logging.devLevel : project.logging.prodLevel,
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: project.logging.timeFormat,
          ignore: project.logging.ignoreFields,
        },
      }
    : undefined,
  // Structured JSON in production — compatible with Datadog, CloudWatch, etc.
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: project.logging.serviceName },
});

export type Logger = typeof logger;
