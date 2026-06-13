import type { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notificationService";
import { parsePagination } from "../lib/pagination";

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const userId = req.user!.id;

      const [items, unreadCount] = await Promise.all([
        notificationService.listForUser(userId, limit, offset),
        notificationService.countUnread(userId),
      ]);

      res.json({ items, unreadCount, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markRead(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllRead(req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
