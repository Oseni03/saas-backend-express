import { Router } from "express";
import { orgController } from "../../controllers/orgController";
import { authenticate, requireVerified } from "../../middleware/authenticate";
import { requireOrg, requireRole } from "../../middleware/requireOrg";
import { validate } from "../../middleware/validate";
import {
  CreateOrgSchema,
  UpdateOrgSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
} from "../../services/orgService";
import { z } from "zod";

const AcceptInviteSchema = z.object({ token: z.string() });

const router = Router();

router.use(authenticate);

// ── Org CRUD ──────────────────────────────────────────────────────────────────
router.post("/",
  requireVerified,
  validate(CreateOrgSchema),
  orgController.create
);

router.get("/", orgController.list);

router.get("/:orgId",         requireOrg,                         orgController.getOne);
router.patch("/:orgId",       requireOrg, requireRole("ADMIN"),   validate(UpdateOrgSchema), orgController.update);
router.delete("/:orgId",      requireOrg, requireRole("OWNER"),   orgController.remove);

// ── Members ───────────────────────────────────────────────────────────────────
router.get("/:orgId/members",              requireOrg,                       orgController.listMembers);
router.delete("/:orgId/members/:userId",   requireOrg, requireRole("ADMIN"), orgController.removeMember);
router.patch("/:orgId/members/:userId",    requireOrg, requireRole("ADMIN"),  validate(UpdateMemberRoleSchema), orgController.updateMemberRole);

// ── Invitations ───────────────────────────────────────────────────────────────
router.get("/:orgId/invitations",    requireOrg, requireRole("ADMIN"), orgController.listInvitations);
router.post("/:orgId/invitations",   requireOrg, requireRole("ADMIN"), validate(InviteMemberSchema), orgController.invite);
router.delete("/:orgId/invitations/:invitationId", requireOrg, requireRole("ADMIN"), orgController.revokeInvitation);

// Accept lives outside /:orgId scope (user may not be a member yet)
router.post("/invitations/accept",  validate(AcceptInviteSchema), orgController.acceptInvitation);

export default router;
