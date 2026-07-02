import { prisma } from "../lib/prisma";

type NotificationCreateInput = Parameters<typeof prisma.notification.create>[0]["data"];

export const notificationService = {
  create: (input: NotificationCreateInput) => prisma.notification.create({ data: input }),

  listForUser: (userId: string, limit: number, offset: number) =>
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),

  countUnread: (userId: string) => prisma.notification.count({ where: { userId, isRead: false } }),

  markRead: (id: string, userId: string) =>
    prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    }),

  markAllRead: (userId: string) =>
    prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }),

  // ── Convenience helpers ──────────────────────────────────────────

  notifyInvitationAccepted: (
    inviterUserId: string,
    joinerName: string,
    orgName: string,
    orgId: string
  ) =>
    prisma.notification.create({
      data: {
        userId: inviterUserId,
        title: `${joinerName} joined ${orgName}`,
        body: `${joinerName} accepted your invitation to join ${orgName}.`,
        link: `/organizations/${orgId}/members`,
        meta: { event: "invitation_accepted", orgId },
      },
    }),

  notifyRoleChanged: (userId: string, newRole: string, orgName: string, orgId: string) =>
    prisma.notification.create({
      data: {
        userId,
        title: `Your role in ${orgName} was updated`,
        body: `You are now a ${newRole} in ${orgName}.`,
        link: `/organizations/${orgId}`,
        meta: { event: "role_changed", orgId, newRole },
      },
    }),

  notifyPlanUpgraded: (userId: string, plan: string, orgName: string, orgId: string) =>
    prisma.notification.create({
      data: {
        userId,
        title: `${orgName} upgraded to ${plan}`,
        body: `Your organization is now on the ${plan} plan. Enjoy the new features!`,
        link: `/organizations/${orgId}/billing`,
        meta: { event: "plan_upgraded", orgId, plan },
      },
    }),
};
