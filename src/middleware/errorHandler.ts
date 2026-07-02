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
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      statusCode: 422,
      errors: err.flatten().fieldErrors,
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    const codeMap: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "AUTHENTICATION_REQUIRED",
      402: "PAYMENT_REQUIRED",
      403: "INSUFFICIENT_PERMISSIONS",
      404: "RESOURCE_NOT_FOUND",
      409: "RESOURCE_ALREADY_EXISTS",
      422: "VALIDATION_ERROR",
      429: "RATE_LIMITED",
    };
    return res.status(err.statusCode).json({
      message: err.message,
      code: codeMap[err.statusCode] ?? "INTERNAL_ERROR",
      statusCode: err.statusCode,
    });
  }

  // JWT errors
  if (err instanceof Error && err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid or expired token",
      code: "AUTHENTICATION_REQUIRED",
      statusCode: 401,
    });
  }
  if (err instanceof Error && err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token expired",
      code: "AUTHENTICATION_REQUIRED",
      statusCode: 401,
    });
  }

  // Unhandled errors
  logger.error({ err, path: req.path, method: req.method }, "unhandled_error");
  return res.status(500).json({
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  });
};
