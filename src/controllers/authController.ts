import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      const tokens = await import("../lib/jwt").then((m) => m.issueTokenPair(user.id));
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          avatar_url: user.avatarUrl,
          is_verified: user.isVerified,
          is_active: user.isActive,
          mfa_enabled: user.mfaEnabled,
          created_at: user.createdAt,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
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

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.body.refresh_token);
      res.json({});
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.refresh(req.body.refresh_token);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.verifyEmail(req.body.token);
      res.json({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        avatar_url: user.avatarUrl,
        is_verified: user.isVerified,
        is_active: user.isActive,
        mfa_enabled: user.mfaEnabled,
        created_at: user.createdAt,
      });
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
      const user = await authService.resetPassword(req.body.token, req.body.new_password);
      res.json({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        avatar_url: user.avatarUrl,
        is_verified: user.isVerified,
        is_active: user.isActive,
        mfa_enabled: user.mfaEnabled,
        created_at: user.createdAt,
      });
    } catch (err) {
      next(err);
    }
  },

  getMe(req: Request, res: Response) {
    const u = req.user!;
    res.json({
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      avatar_url: u.avatarUrl,
      is_verified: u.isVerified,
      is_active: u.isActive,
      mfa_enabled: u.mfaEnabled,
      created_at: u.createdAt,
    });
  },
};
