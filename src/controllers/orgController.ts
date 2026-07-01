import type { Request, Response, NextFunction } from "express";
import { MemberRole } from "@prisma/client";
import { orgService } from "../services/orgService";
import { orgRepository } from "../repositories/orgRepository";

function sanitizeOrg(org: any) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo_url: org.logoUrl,
    plan: org.plan,
    created_at: org.createdAt,
  };
}

function sanitizeMembership(m: any) {
  return {
    user_id: m.userId,
    organization_id: m.organizationId,
    role: m.role,
    created_at: m.createdAt,
    name: m.user?.fullName,
    email: m.user?.email,
    avatar_url: m.user?.avatarUrl,
  };
}

function sanitizeInvitation(inv: any) {
  return {
    id: inv.id,
    organization_id: inv.organizationId,
    email: inv.email,
    status: inv.status,
    expires_at: inv.expiresAt,
  };
}

export const orgController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await orgService.create(req.body, req.user!.id);
      res.status(201).json(sanitizeOrg(org));
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgs = await orgService.listForUser(req.user!.id);
      res.json(orgs.map(sanitizeOrg));
    } catch (err) {
      next(err);
    }
  },

  getOne(req: Request, res: Response) {
    res.json(sanitizeOrg(req.org!));
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await orgService.update(req.org!.id, req.body);
      res.json(sanitizeOrg(updated));
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await orgService.delete(req.org!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await orgService.inviteMember(req.org!.id, req.body, req.user!.id);
      res.status(201).json({});
    } catch (err) {
      next(err);
    }
  },

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await orgService.acceptInvitation(req.body.token, req.user!.id);
      res.json(sanitizeOrg(org));
    } catch (err) {
      next(err);
    }
  },

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const membership = await orgService.updateMemberRole(
        req.org!.id,
        req.params.userId,
        req.body.role as MemberRole
      );
      res.json(sanitizeMembership(membership));
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      await orgService.removeMember(req.org!.id, req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await prisma.membership.findMany({
        where: { organizationId: req.org!.id },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, avatarUrl: true, isVerified: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      res.json(members.map(sanitizeMembership));
    } catch (err) {
      next(err);
    }
  },

  async listInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const { invitationRepository } = await import("../repositories/invitationRepository");
      const invitations = await invitationRepository.listByOrg(req.org!.id);
      res.json(invitations.map(sanitizeInvitation));
    } catch (err) {
      next(err);
    }
  },
};

// Import prisma directly here (needed by listMembers)
import { prisma } from "../lib/prisma";
