import type { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notificationService";
import { parsePagination } from "../lib/pagination";

function sanitizeNotification(notif: any) {
  return {
    id: notif.id,
    title: notif.title,
    body: notif.body,
    link: notif.link,
    is_read: notif.isRead,
    read_at: notif.readAt,
    meta: notif.meta,
    created_at: notif.createdAt,
  };
}

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
      const userId = req.user!.id;

      const [items, unreadCount] = await Promise.all([
        notificationService.listForUser(userId, limit, offset),
        notificationService.countUnread(userId),
      ]);

      res.json({ items: items.map(sanitizeNotification), unread_count: unreadCount });
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
