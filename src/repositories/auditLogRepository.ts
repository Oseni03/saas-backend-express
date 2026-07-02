import { prisma } from "../lib/prisma";

type AuditLogCreateInput = Parameters<typeof prisma.auditLog.create>[0]["data"];

export const auditLogRepository = {
  create: (data: AuditLogCreateInput) => prisma.auditLog.create({ data }),

  listByOrg: (organizationId: string, limit: number, offset: number) =>
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),

  countByOrg: (organizationId: string) =>
    prisma.auditLog.count({ where: { organizationId } }),
};
