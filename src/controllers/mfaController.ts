import type { Request, Response, NextFunction } from "express";
import { mfaService } from "../services/mfaService";

export const mfaController = {
  async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await mfaService.setup(req.user!.id);
      res.json({
        secret: result.secret,
        otpauthUrl: result.otpauthUrl,
        message: "Scan the QR code or enter the secret in your authenticator app, then call /mfa/verify.",
      });
    } catch (err) {
      next(err);
    }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      await mfaService.verify(req.user!.id, req.body.code);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      await mfaService.disable(req.user!.id, req.body.code);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await mfaService.validate(req.user!.id, req.body.code);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },
};
