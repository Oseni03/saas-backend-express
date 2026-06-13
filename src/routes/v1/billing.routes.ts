import { Router } from "express";
import { billingController } from "../../controllers/billingController";
import { authenticate } from "../../middleware/authenticate";
import { requireOrg, requireRole } from "../../middleware/requireOrg";

const router = Router();

// ── Paystack webhook ──────────────────────────────────────────────────────────
// Must receive the raw body for HMAC-SHA512 signature verification.
// No auth middleware — Paystack calls this directly.
router.post(
  "/webhooks/paystack",
  billingController.webhook
);

// ── Verify callback ───────────────────────────────────────────────────────────
// Called by your frontend after Paystack redirects back with ?reference=xxx.
// Does NOT need org middleware — user may be switching orgs.
router.get(
  "/verify",
  authenticate,
  billingController.verify
);

// ── Org-scoped billing actions ────────────────────────────────────────────────
router.post(
  "/organizations/:orgId/initialize",
  authenticate,
  requireOrg,
  requireRole("OWNER"),
  billingController.initialize
);

router.get(
  "/organizations/:orgId/manage",
  authenticate,
  requireOrg,
  requireRole("OWNER"),
  billingController.manageUrl
);

router.post(
  "/organizations/:orgId/cancel",
  authenticate,
  requireOrg,
  requireRole("OWNER"),
  billingController.cancel
);

export default router;
