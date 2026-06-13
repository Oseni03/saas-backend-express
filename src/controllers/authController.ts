import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.login(req.body);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.verifyEmail(req.body.token);
      res.json({ id: user.id, email: user.email, isVerified: user.isVerified });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.status(202).json({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json({ id: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  },

  getMe(req: Request, res: Response) {
    const u = req.user!;
    res.json({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
      isActive: u.isActive,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
    });
  },
};
