import type { Request, Response, NextFunction } from "express";
import { mfaService } from "../services/mfaService";

export const mfaController = {
  async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await mfaService.setup(req.user!.id);
      res.json({
        secret: result.secret,
        otpauthUrl: result.otpauthUrl,
      });
    } catch (err) {
      next(err);
    }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      await mfaService.verify(req.user!.id, req.query.code as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      await mfaService.disable(req.user!.id, req.query.code as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await mfaService.validate(req.user!.id, req.query.code as string);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },
};
