import { PlanTier } from "@prisma/client";
import { PaymentRequiredError } from "../middleware/errors";
import type { PlanLimits } from "../types";

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxMembers: 5,
    maxProjects: 3,
    auditLogRetentionDays: 7,
    mfaRequired: false,
    ssoEnabled: false,
    prioritySupport: false,
  },
  PRO: {
    maxMembers: 50,
    maxProjects: null,
    auditLogRetentionDays: 90,
    mfaRequired: false,
    ssoEnabled: false,
    prioritySupport: true,
  },
  ENTERPRISE: {
    maxMembers: null,
    maxProjects: null,
    auditLogRetentionDays: 365,
    mfaRequired: true,
    ssoEnabled: true,
    prioritySupport: true,
  },
};

export function getLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function assertMemberLimit(plan: PlanTier, currentCount: number): void {
  const limits = getLimits(plan);
  if (limits.maxMembers !== null && currentCount >= limits.maxMembers) {
    throw new PaymentRequiredError(
      `Your plan allows a maximum of ${limits.maxMembers} members. Upgrade to add more.`
    );
  }
}

export function assertFeatureAvailable(plan: PlanTier, feature: "sso" | "prioritySupport"): void {
  const limits = getLimits(plan);
  if (!limits[feature]) {
    throw new PaymentRequiredError(
      `The '${feature}' feature is not available on your current plan. Please upgrade.`
    );
  }
}
