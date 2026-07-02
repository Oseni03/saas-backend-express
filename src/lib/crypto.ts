import bcrypt from "bcryptjs";
import crypto from "crypto";
import { project } from "../config/project";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, project.bcryptRounds);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/** Generate a cryptographically random URL-safe token. */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Store this in the DB — compare with verifyTokenHash. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyTokenHash(token: string, stored: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(hashToken(token)), Buffer.from(stored));
}
