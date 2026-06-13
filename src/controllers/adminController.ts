import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { userRepository } from "../repositories/userRepository";
import { orgRepository } from "../repositories/orgRepository";
import { parsePagination } from "../lib/pagination";
import { NotFoundError } from "../middleware/errors";

export const adminController = {
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [totalUsers, verifiedUsers, totalOrgs] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isVerified: true } }),
        prisma.organization.count(),
      ]);
      res.json({ users: { total: totalUsers, verified: verifiedUsers }, organizations: { total: totalOrgs } });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const [users, total] = await Promise.all([
        userRepository.listAll(limit, offset),
        userRepository.countAll(),
      ]);
      res.json({ items: users, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async listOrgs(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const [orgs, total] = await Promise.all([
        orgRepository.listAll(limit, offset),
        orgRepository.countAll(),
      ]);
      res.json({ items: orgs, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById(req.params.userId);
      if (!user) throw new NotFoundError("User");
      const updated = await userRepository.update(req.params.userId, { isActive: false });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async activateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById(req.params.userId);
      if (!user) throw new NotFoundError("User");
      const updated = await userRepository.update(req.params.userId, { isActive: true });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
};
