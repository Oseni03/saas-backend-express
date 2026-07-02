import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { userRepository } from "../repositories/userRepository";
import { project } from "../config/project";
import { UnauthorizedError } from "../middleware/errors";

const UpdateProfileSchema = z.object({
  full_name: z.string().max(255).optional(),
  avatar_url: z.string().url().optional(),
});

const ChangePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(project.password.minLength).max(project.password.maxLength),
});

function sanitize(user: NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>) {
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

export const userController = {
  getProfile(req: Request, res: Response) {
    res.json(sanitize(req.user!));
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const input = UpdateProfileSchema.parse(req.body);
      const updated = await userRepository.update(req.user!.id, {
        fullName: input.full_name,
        avatarUrl: input.avatar_url,
      });
      res.json(sanitize(updated));
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const input = ChangePasswordSchema.parse(req.body);
      const user = req.user!;

      if (!user.hashedPassword) {
        throw new UnauthorizedError("OAuth accounts cannot change passwords directly");
      }
      const valid = await verifyPassword(input.current_password, user.hashedPassword);
      if (!valid) throw new UnauthorizedError("Current password is incorrect");

      await userRepository.update(user.id, {
        hashedPassword: await hashPassword(input.new_password),
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      await userRepository.update(req.user!.id, { isActive: false });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
