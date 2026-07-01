import { MemberRole, InvitationStatus } from "@prisma/client";
import slugify from "slug";
import dayjs from "dayjs";
import { z } from "zod";

import { generateToken, hashToken } from "../lib/crypto";
import { sendInvitationEmail } from "../lib/email";
import { orgRepository } from "../repositories/orgRepository";
import { userRepository } from "../repositories/userRepository";
import { invitationRepository } from "../repositories/invitationRepository";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../middleware/errors";
import { assertMemberLimit } from "./permissionsService";

// ── Schemas ───────────────────────────────────────────────────────────────────

export const CreateOrgSchema = z.object({ name: z.string().min(1).max(255) });

export const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logo_url: z.string().url().optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(MemberRole).default(MemberRole.MEMBER),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.nativeEnum(MemberRole),
});

// ── Service ───────────────────────────────────────────────────────────────────

export const orgService = {
  async create(input: z.infer<typeof CreateOrgSchema>, ownerId: string) {
    const baseSlug = slugify(input.name, { lower: true });
    const slug = await uniqueSlug(baseSlug);

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { name: input.name, slug },
      });
      await tx.membership.create({
        data: { userId: ownerId, organizationId: created.id, role: MemberRole.OWNER },
      });
      return created;
    });

    logger.info({ orgId: org.id, ownerId }, "org.created");
    return org;
  },

  async update(orgId: string, input: z.infer<typeof UpdateOrgSchema>) {
    return orgRepository.update(orgId, {
      ...(input.name && { name: input.name }),
      ...(input.logo_url && { logoUrl: input.logo_url }),
    });
  },

  async delete(orgId: string) {
    await orgRepository.delete(orgId);
    logger.info({ orgId }, "org.deleted");
  },

  listForUser: (userId: string) => orgRepository.listForUser(userId),

  async inviteMember(orgId: string, input: z.infer<typeof InviteMemberSchema>, actorId: string) {
    const email = input.email.toLowerCase().trim();

    // Check for duplicate pending invite
    const existing = await invitationRepository.findPendingByEmailAndOrg(email, orgId);
    if (existing) throw new ConflictError("A pending invitation already exists for this email");

    // Check if already a member
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const alreadyMember = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId: orgId } },
      });
      if (alreadyMember) throw new ConflictError("This user is already a member");
    }

    // Check plan limits
    const memberCount = await prisma.membership.count({ where: { organizationId: orgId } });
    const org = await orgRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");
    assertMemberLimit(org.plan, memberCount);

    const rawToken = generateToken();
    const invitation = await invitationRepository.create({
      organizationId: orgId,
      email,
      role: input.role,
      token: hashToken(rawToken),
      invitedById: actorId,
      expiresAt: dayjs().add(7, "days").toDate(),
    });

    const actor = await userRepository.findById(actorId);
    await sendInvitationEmail(
      email,
      actor?.fullName ?? actor?.email ?? "Someone",
      org.name,
      rawToken,
      input.role.toLowerCase()
    ).catch(() => {});

    logger.info({ orgId, email, actorId }, "org.invitation_sent");
    return invitation;
  },

  async acceptInvitation(token: string, userId: string) {
    const hashed = hashToken(token);
    const invitation = await invitationRepository.findByToken(hashed);

    if (!invitation) throw new BadRequestError("Invalid or expired invitation");
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestError(`Invitation is ${invitation.status.toLowerCase()}`);
    }
    if (dayjs().isAfter(invitation.expiresAt)) {
      await invitationRepository.update(invitation.id, { status: InvitationStatus.EXPIRED });
      throw new BadRequestError("Invitation has expired");
    }

    const user = await userRepository.findById(userId);
    if (user?.email !== invitation.email) {
      throw new ForbiddenError("This invitation was sent to a different email address");
    }

    await prisma.$transaction([
      prisma.membership.create({
        data: { userId, organizationId: invitation.organizationId, role: invitation.role },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      }),
    ]);

    logger.info({ orgId: invitation.organizationId, userId }, "org.invitation_accepted");
    return orgRepository.findById(invitation.organizationId);
  },

  async updateMemberRole(orgId: string, targetUserId: string, newRole: MemberRole) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
    if (!membership) throw new NotFoundError("Member");

    return prisma.membership.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
      data: { role: newRole },
    });
  },

  async removeMember(orgId: string, targetUserId: string) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
    if (!membership) throw new NotFoundError("Member");

    await prisma.membership.delete({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
    logger.info({ orgId, targetUserId }, "org.member_removed");
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 1;
  while (await orgRepository.findBySlug(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}
