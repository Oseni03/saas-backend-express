import { Resend } from "resend";
import { config } from "../config";
import { logger } from "./logger";

const resend = new Resend(config.RESEND_API_KEY);

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!config.RESEND_API_KEY) {
    logger.warn({ to, subject }, "email.skipped — RESEND_API_KEY not set");
    return;
  }
  try {
    await resend.emails.send({
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, "email.sent");
  } catch (err) {
    logger.error({ err, to, subject }, "email.failed");
    throw err;
  }
}

export async function sendVerificationEmail(
  to: string,
  fullName: string,
  token: string
): Promise<void> {
  const url = `${config.FRONTEND_URL}/verify-email?token=${token}`;
  await send(
    to,
    `Verify your email — ${config.APP_NAME}`,
    `<h2>Welcome to ${config.APP_NAME}, ${fullName || "there"}!</h2>
     <p>Click below to verify your email address:</p>
     <p><a href="${url}" style="padding:10px 20px;background:#4F46E5;color:white;border-radius:6px;text-decoration:none;">Verify Email</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${config.FRONTEND_URL}/reset-password?token=${token}`;
  await send(
    to,
    `Reset your password — ${config.APP_NAME}`,
    `<h2>Password Reset</h2>
     <p>Click below to reset your password. Expires in 1 hour.</p>
     <p><a href="${url}" style="padding:10px 20px;background:#4F46E5;color:white;border-radius:6px;text-decoration:none;">Reset Password</a></p>
     <p>If you didn't request this, ignore this email.</p>`
  );
}

export async function sendInvitationEmail(
  to: string,
  invitedBy: string,
  orgName: string,
  token: string,
  role: string
): Promise<void> {
  const url = `${config.FRONTEND_URL}/invitations/accept?token=${token}`;
  await send(
    to,
    `${invitedBy} invited you to ${orgName}`,
    `<h2>You've been invited!</h2>
     <p><strong>${invitedBy}</strong> invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
     <p><a href="${url}" style="padding:10px 20px;background:#4F46E5;color:white;border-radius:6px;text-decoration:none;">Accept Invitation</a></p>
     <p>This invitation expires in 7 days.</p>`
  );
}

export async function sendWelcomeEmail(to: string, fullName: string): Promise<void> {
  await send(
    to,
    `Welcome to ${config.APP_NAME}!`,
    `<h2>Welcome aboard, ${fullName || "there"}! 🎉</h2>
     <p>Your account is all set up.</p>
     <p><a href="${config.FRONTEND_URL}/dashboard" style="padding:10px 20px;background:#4F46E5;color:white;border-radius:6px;text-decoration:none;">Go to Dashboard</a></p>`
  );
}
