import { generateSecret, generateURI, verify as verifyOTP } from "otplib";
import { config } from "../config";
import { userRepository } from "../repositories/userRepository";
import { BadRequestError, UnauthorizedError } from "../middleware/errors";
import { issueTokenPair } from "../lib/jwt";
import { logger } from "../lib/logger";

export const mfaService = {
  async setup(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError();
    if (user.mfaEnabled) throw new BadRequestError("MFA is already enabled");

    const secret = generateSecret();
    const otpauthUrl = generateURI({ label: config.APP_NAME, issuer: user.email, secret });

    // Store unconfirmed secret — user must verify before it activates
    await userRepository.update(userId, { mfaSecret: secret });

    return { secret, otpauthUrl };
  },

  async verify(userId: string, code: string) {
    const user = await userRepository.findById(userId);
    if (!user?.mfaSecret) throw new BadRequestError("Call /mfa/setup first");
    if (user.mfaEnabled) throw new BadRequestError("MFA is already enabled");

    if (!verifyOTP({ token: code, secret: user.mfaSecret })) {
      throw new BadRequestError("Invalid or expired TOTP code");
    }

    await userRepository.update(userId, { mfaEnabled: true });
    logger.info({ userId }, "mfa.enabled");
  },

  async disable(userId: string, code: string) {
    const user = await userRepository.findById(userId);
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestError("MFA is not enabled on your account");
    }

    if (!verifyOTP({ token: code, secret: user.mfaSecret })) {
      throw new UnauthorizedError("Invalid TOTP code");
    }

    await userRepository.update(userId, { mfaEnabled: false, mfaSecret: null });
    logger.info({ userId }, "mfa.disabled");
  },

  async validate(userId: string, code: string) {
    const user = await userRepository.findById(userId);
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestError("MFA is not enabled on your account");
    }

    if (!verifyOTP({ token: code, secret: user.mfaSecret })) {
      throw new UnauthorizedError("Invalid or expired TOTP code");
    }

    return issueTokenPair(userId);
  },
};
