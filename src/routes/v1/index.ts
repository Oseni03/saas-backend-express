import { Router } from "express";
import healthRouter from "./health.routes";
import authRouter from "./auth.routes";
import oauthRouter from "./oauth.routes";
import usersRouter from "./users.routes";
import orgsRouter from "./organizations.routes";
import billingRouter from "./billing.routes";
import notificationsRouter from "./notifications.routes";
import mfaRouter from "./mfa.routes";
import adminRouter from "./admin.routes";
import auditLogsRouter from "./auditLogs.routes";

const router = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/auth/oauth", oauthRouter);
router.use("/users", usersRouter);
router.use("/organizations", orgsRouter);
router.use("/billing", billingRouter);
router.use("/notifications", notificationsRouter);
router.use("/mfa", mfaRouter);
router.use("/admin", adminRouter);
router.use("/audit-logs", auditLogsRouter);

export default router;
