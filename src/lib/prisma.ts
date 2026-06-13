import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "../config";

declare global {
  // Prevent multiple instances in dev with hot reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isDevelopment ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (isDevelopment) {
  global.__prisma = prisma;
}
