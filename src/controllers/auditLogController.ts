import type { Request, Response, NextFunction } from "express";
import { auditLogRepository } from "../repositories/auditLogRepository";
import { parsePagination, buildPagedResponse } from "../lib/pagination";

export const auditLogController = {
  async listByOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const orgId = req.org!.id;

      const [items, total] = await Promise.all([
        auditLogRepository.listByOrg(orgId, limit, offset),
        auditLogRepository.countByOrg(orgId),
      ]);

      res.json(buildPagedResponse(items, total, limit, offset));
    } catch (err) {
      next(err);
    }
  },
};
