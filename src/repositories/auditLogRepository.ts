import { prisma } from "../lib/prisma";

interface CreateAuditLogInput {
  action: string;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export const auditLogRepository = {
  create: (data: CreateAuditLogInput) => prisma.auditLog.create({ data }),

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
