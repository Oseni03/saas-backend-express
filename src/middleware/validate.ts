import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type ValidationTarget = "body" | "query" | "params";

/**
 * Validates and coerces req[target] against a Zod schema.
 * Replaces the target with the parsed result (adds defaults, strips extras).
 *
 * Usage:
 *   router.post("/", validate(RegisterSchema), authController.register)
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = "body"
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(result.error); // Caught by errorHandler as ZodError → 422
    }
    // Replace with parsed (coerced + defaulted) data
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
