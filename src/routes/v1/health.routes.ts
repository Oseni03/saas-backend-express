import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { config } from "../../config";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", app: config.APP_NAME });
});

router.get("/ready", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch (err) {
    next(err);
  }
});

export default router;
