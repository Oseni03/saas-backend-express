import { InvitationStatus } from "@/generated/prisma";
import { prisma } from "../lib/prisma";

export const invitationRepository = {
  findById: (id: string) =>
    prisma.invitation.findUnique({ where: { id } }),

  findByToken: (token: string) =>
    prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    }),

  findPendingByEmailAndOrg: (email: string, organizationId: string) =>
    prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        organizationId,
        status: InvitationStatus.PENDING,
      },
    }),

  listByOrg: (organizationId: string) =>
    prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),

  create: (data: Parameters<typeof prisma.invitation.create>[0]["data"]) =>
    prisma.invitation.create({ data }),

  update: (id: string, data: Parameters<typeof prisma.invitation.update>[0]["data"]) =>
    prisma.invitation.update({ where: { id }, data }),
};
