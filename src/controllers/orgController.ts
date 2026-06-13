import type { Request, Response, NextFunction } from "express";
import { MemberRole } from "@prisma/client";
import { orgService } from "../services/orgService";
import { orgRepository } from "../repositories/orgRepository";

export const orgController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await orgService.create(req.body, req.user!.id);
      res.status(201).json(org);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgs = await orgService.listForUser(req.user!.id);
      res.json(orgs);
    } catch (err) {
      next(err);
    }
  },

  getOne(req: Request, res: Response) {
    res.json(req.org!);
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await orgService.update(req.org!.id, req.body);
      res.json(updated);
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
      res.status(201).json({ message: "Invitation sent", id: invitation.id });
    } catch (err) {
      next(err);
    }
  },

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await orgService.acceptInvitation(req.body.token, req.user!.id);
      res.json(org);
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
      res.json(membership);
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
      res.json(members);
    } catch (err) {
      next(err);
    }
  },

  async listInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const { invitationRepository } = await import("../repositories/invitationRepository");
      const invitations = await invitationRepository.listByOrg(req.org!.id);
      res.json(invitations);
    } catch (err) {
      next(err);
    }
  },
};

// Import prisma directly here (needed by listMembers)
import { prisma } from "../lib/prisma";
