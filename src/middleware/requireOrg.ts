import type { Request, Response, NextFunction } from "express";
import { MemberRole } from "@/generated/prisma";
import { prisma } from "../lib/prisma";
import { project } from "../config/project";
import { ForbiddenError, NotFoundError } from "./errors";

const ROLE_RANK = project.roleRank as Record<MemberRole, number>;

/**
 * Loads org from req.params.orgId and verifies the current user is a member.
 * Attaches req.org and req.membership.
 */
export async function requireOrg(req: Request, _res: Response, next: NextFunction) {
  try {
    const { orgId } = req.params;
    const userId = req.user!.id;

    const org = await prisma.organization.findUnique({ where: { id: orgId as string } });
    if (!org) throw new NotFoundError("Organization");

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId as string } },
    });
    if (!membership) throw new ForbiddenError("You are not a member of this organization");

    req.org = org;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Factory: returns middleware that enforces a minimum role.
 * Must be used after requireOrg.
 *
 * Usage: router.delete("/:orgId", requireOrg, requireRole("OWNER"), ...)
 */
export function requireRole(minRole: MemberRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const membership = req.membership;
    if (!membership) return next(new ForbiddenError());

    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      return next(new ForbiddenError("You do not have sufficient permissions"));
    }
    next();
  };
}
