import type { OAuthProvider } from "@/generated/prisma";
import { prisma } from "../lib/prisma";

export const userRepository = {
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } }),

  findByOAuth: (provider: OAuthProvider, providerId: string) =>
    prisma.user.findFirst({
      where: { oauthProvider: provider, oauthProviderId: providerId },
    }),

  findByVerificationToken: (token: string) =>
    prisma.user.findFirst({ where: { verificationToken: token } }),

  findByResetToken: (token: string) => prisma.user.findFirst({ where: { resetToken: token } }),

  create: (data: Parameters<typeof prisma.user.create>[0]["data"]) => prisma.user.create({ data }),

  update: (id: string, data: Parameters<typeof prisma.user.update>[0]["data"]) =>
    prisma.user.update({ where: { id }, data }),

  delete: (id: string) => prisma.user.delete({ where: { id } }),

  listAll: (limit: number, offset: number) =>
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),

  countAll: () => prisma.user.count(),
};
