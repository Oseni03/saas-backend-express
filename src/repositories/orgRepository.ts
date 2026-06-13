import { prisma } from "../lib/prisma";

export const orgRepository = {
  findById: (id: string) =>
    prisma.organization.findUnique({
      where: { id },
      include: { memberships: true },
    }),

  findBySlug: (slug: string) => prisma.organization.findUnique({ where: { slug } }),

  findByPaystackCustomerId: (customerCode: string) =>
    prisma.organization.findUnique({ where: { paystackCustomerId: customerCode } }),

  listForUser: (userId: string) =>
    prisma.organization.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: "desc" },
    }),

  create: (data: Parameters<typeof prisma.organization.create>[0]["data"]) =>
    prisma.organization.create({ data }),

  update: (id: string, data: Parameters<typeof prisma.organization.update>[0]["data"]) =>
    prisma.organization.update({ where: { id }, data }),

  delete: (id: string) => prisma.organization.delete({ where: { id } }),

  listAll: (limit: number, offset: number) =>
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),

  countAll: () => prisma.organization.count(),
};
