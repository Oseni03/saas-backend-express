import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { userRepository } from "../repositories/userRepository";
import { UnauthorizedError } from "../middleware/errors";

const UpdateProfileSchema = z.object({
  fullName: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
});

function sanitize(user: NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    isActive: user.isActive,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const userController = {
  getProfile(req: Request, res: Response) {
    res.json(sanitize(req.user!));
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const input = UpdateProfileSchema.parse(req.body);
      const updated = await userRepository.update(req.user!.id, input);
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
      const valid = await verifyPassword(input.currentPassword, user.hashedPassword);
      if (!valid) throw new UnauthorizedError("Current password is incorrect");

      await userRepository.update(user.id, {
        hashedPassword: await hashPassword(input.newPassword),
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
