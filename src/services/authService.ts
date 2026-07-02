import { OAuthProvider } from "@/generated/prisma";
import dayjs from "dayjs";

import { issueTokenPair, issueMfaPendingToken, verifyRefreshToken } from "../lib/jwt";
import { hashPassword, verifyPassword, generateToken, hashToken } from "../lib/crypto";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../lib/email";
import { userRepository } from "../repositories/userRepository";
import { logger } from "../lib/logger";
import { ConflictError, UnauthorizedError, BadRequestError } from "../middleware/errors";

// ── Schemas ──────────────────────────────────────────────────────────────────
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8)
    .max(128)
    .refine((v) => /[A-Z]/.test(v), "Must contain an uppercase letter")
    .refine((v) => /[0-9]/.test(v), "Must contain a digit"),
  full_name: z.string().max(255).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RefreshSchema = z.object({ refresh_token: z.string() });

export const VerifyEmailSchema = z.object({ token: z.string() });

export const ForgotPasswordSchema = z.object({ email: z.string().email() });

export const ResetPasswordSchema = z.object({
  token: z.string(),
  new_password: z.string().min(8).max(128),
});

// ── Service ───────────────────────────────────────────────────────────────────

export const authService = {
  async register(input: z.infer<typeof RegisterSchema>) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("An account with this email already exists");

    const verificationToken = generateToken();
    const user = await userRepository.create({
      email: input.email.toLowerCase().trim(),
      hashedPassword: await hashPassword(input.password),
      fullName: input.full_name,
      verificationToken: hashToken(verificationToken),
    });

    await sendVerificationEmail(user.email, user.fullName ?? "", verificationToken).catch(() => {});
    logger.info({ userId: user.id }, "auth.registered");
    return user;
  },

  async login(input: z.infer<typeof LoginSchema>) {
    const user = await userRepository.findByEmail(input.email);
    if (!user?.hashedPassword) throw new UnauthorizedError("Invalid email or password");

    const valid = await verifyPassword(input.password, user.hashedPassword);
    if (!valid) throw new UnauthorizedError("Invalid email or password");
    if (!user.isActive) throw new UnauthorizedError("Account is deactivated");

    logger.info({ userId: user.id }, "auth.login");

    // If MFA is enabled, return mfa_pending token instead of full TokenPair
    if (user.mfaEnabled) {
      return issueMfaPendingToken(user.id);
    }

    return issueTokenPair(user.id);
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await userRepository.findById(payload.sub);
    if (!user?.isActive) throw new UnauthorizedError("User not found or inactive");
    return issueTokenPair(user.id);
  },

  async verifyEmail(token: string) {
    const hashed = hashToken(token);
    const user = await userRepository.findByVerificationToken(hashed);
    if (!user) throw new BadRequestError("Invalid or expired verification token");

    const updated = await userRepository.update(user.id, {
      isVerified: true,
      verificationToken: null,
    });

    await sendWelcomeEmail(updated.email, updated.fullName ?? "").catch(() => {});
    logger.info({ userId: user.id }, "auth.email_verified");
    return updated;
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // Silent — don't reveal email existence

    const token = generateToken();
    await userRepository.update(user.id, {
      resetToken: hashToken(token),
      resetTokenExpiresAt: dayjs().add(1, "hour").toDate(),
    });

    await sendPasswordResetEmail(user.email, token).catch(() => {});
    logger.info({ userId: user.id }, "auth.password_reset_requested");
  },

  async resetPassword(token: string, newPassword: string) {
    const hashed = hashToken(token);
    const user = await userRepository.findByResetToken(hashed);
    if (!user) throw new BadRequestError("Invalid or expired reset token");
    if (user.resetTokenExpiresAt && dayjs().isAfter(user.resetTokenExpiresAt)) {
      throw new BadRequestError("Reset token has expired");
    }

    const updated = await userRepository.update(user.id, {
      hashedPassword: await hashPassword(newPassword),
      resetToken: null,
      resetTokenExpiresAt: null,
    });

    logger.info({ userId: user.id }, "auth.password_reset");
    return updated;
  },

  async oauthLoginOrRegister(
    provider: OAuthProvider,
    providerId: string,
    email: string,
    fullName?: string,
    avatarUrl?: string
  ) {
    let user = await userRepository.findByOAuth(provider, providerId);

    if (!user) {
      user = await userRepository.findByEmail(email);
      if (user) {
        user = await userRepository.update(user.id, {
          oauthProvider: provider,
          oauthProviderId: providerId,
          isVerified: true,
        });
      } else {
        user = await userRepository.create({
          email: email.toLowerCase().trim(),
          fullName,
          avatarUrl,
          isVerified: true,
          oauthProvider: provider,
          oauthProviderId: providerId,
        });
        logger.info({ userId: user.id, provider }, "auth.oauth_registered");
      }
    }

    logger.info({ userId: user.id, provider }, "auth.oauth_login");
    return issueTokenPair(user.id);
  },
};
