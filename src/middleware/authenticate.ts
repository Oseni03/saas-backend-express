import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, verifyMfaPendingToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { UnauthorizedError, ForbiddenError } from "./errors";

/**
 * Validates the Bearer token and attaches req.user.
 * Throws 401 if missing/invalid, 401 if user not found or inactive.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError();

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedError("User not found");
    if (!user.isActive) throw new UnauthorizedError("Account is inactive");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates an mfa_pending token and attaches req.user (minimal context).
 * Only allows access to complete MFA validation flow.
 * Throws 401 if missing/invalid or not an mfa_pending token.
 */
export async function authenticateMfaPending(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError();

    const token = header.slice(7);
    const payload = verifyMfaPendingToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedError("User not found");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Requires a verified email. Call after authenticate. */
export function requireVerified(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isVerified) {
    return next(new ForbiddenError("Please verify your email address before continuing"));
  }
  next();
}

/** Requires superuser flag. Call after authenticate. */
export function requireSuperuser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isSuperuser) {
    return next(new ForbiddenError("Superuser access required"));
  }
  next();
}

/**
 * Requires admin access: either system-level superuser flag or admin role in any organization.
 * Call after authenticate. Throws 403 if user is not an admin.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = req.user!;

    // System-level admin
    if (user.isSuperuser) {
      return next();
    }

    // Check for admin role in any organization
    const adminRole = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: "ADMIN",
      },
    });

    if (adminRole) {
      return next();
    }

    next(new ForbiddenError("Admin access required"));
  } catch (err) {
    next(err);
  }
}
