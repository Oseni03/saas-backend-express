import type { Request, Response, NextFunction } from "express";
import type { User, Organization } from "@/generated/prisma";
import { prisma } from "../lib/prisma";
import { userRepository } from "../repositories/userRepository";
import { orgRepository } from "../repositories/orgRepository";
import { parsePagination } from "../lib/pagination";
import { NotFoundError } from "../middleware/errors";

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    is_verified: user.isVerified,
    is_active: user.isActive,
    mfa_enabled: user.mfaEnabled,
    created_at: user.createdAt,
  };
}

function sanitizeOrg(org: Organization) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo_url: org.logoUrl,
    plan: org.plan,
    created_at: org.createdAt,
  };
}

export const adminController = {
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [totalUsers, verifiedUsers, totalOrgs] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isVerified: true } }),
        prisma.organization.count(),
      ]);
      res.json({
        users: { total: totalUsers, verified: verifiedUsers },
        organizations: { total: totalOrgs },
      });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const [users] = await Promise.all([
        userRepository.listAll(limit, offset),
        userRepository.countAll(),
      ]);
      res.json(users.map(sanitizeUser));
    } catch (err) {
      next(err);
    }
  },

  async listOrgs(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const [orgs] = await Promise.all([
        orgRepository.listAll(limit, offset),
        orgRepository.countAll(),
      ]);
      res.json(orgs.map(sanitizeOrg));
    } catch (err) {
      next(err);
    }
  },

  async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const user = await userRepository.findById(userId);
      if (!user) throw new NotFoundError("User");
      const updated = await userRepository.update(userId, { isActive: false });
      res.json(sanitizeUser(updated));
    } catch (err) {
      next(err);
    }
  },

  async activateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const user = await userRepository.findById(userId);
      if (!user) throw new NotFoundError("User");
      const updated = await userRepository.update(userId, { isActive: true });
      res.json(sanitizeUser(updated));
    } catch (err) {
      next(err);
    }
  },
};
