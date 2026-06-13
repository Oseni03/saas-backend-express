import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  PaymentRequiredError,
} from "../../src/middleware/errors";

describe("Error classes", () => {
  it("AppError sets statusCode and message", () => {
    const err = new AppError(418, "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err instanceof Error).toBe(true);
  });

  it("NotFoundError returns 404", () => {
    const err = new NotFoundError("User");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("User");
  });

  it("ConflictError returns 409", () => {
    expect(new ConflictError().statusCode).toBe(409);
  });

  it("UnauthorizedError returns 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it("ForbiddenError returns 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it("BadRequestError returns 400", () => {
    expect(new BadRequestError().statusCode).toBe(400);
  });

  it("PaymentRequiredError returns 402", () => {
    expect(new PaymentRequiredError().statusCode).toBe(402);
  });

  it("all errors are instances of AppError", () => {
    const errors = [
      new NotFoundError(),
      new ConflictError(),
      new UnauthorizedError(),
      new ForbiddenError(),
      new BadRequestError(),
      new PaymentRequiredError(),
    ];
    errors.forEach((e) => expect(e instanceof AppError).toBe(true));
  });
});
