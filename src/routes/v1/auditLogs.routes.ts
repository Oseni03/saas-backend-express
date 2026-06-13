import { Router } from "express";
import { auditLogController } from "../../controllers/auditLogController";
import { authenticate } from "../../middleware/authenticate";
import { requireOrg, requireRole } from "../../middleware/requireOrg";

const router = Router();

// Only admins and owners can view audit logs
router.get(
  "/organizations/:orgId",
  authenticate,
  requireOrg,
  requireRole("ADMIN"),
  auditLogController.listByOrg
);

export default router;
