import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { logger } from "../lib/logger";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // JWT errors
  if (err instanceof Error && err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  if (err instanceof Error && err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  // Unhandled errors
  logger.error({ err, path: req.path, method: req.method }, "unhandled_error");
  return res.status(500).json({ error: "An unexpected error occurred" });
};
