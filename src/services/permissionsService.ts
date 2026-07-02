import { PlanTier } from "@/generated/prisma";
import { PaymentRequiredError } from "../middleware/errors";
import { project } from "../config/project";
import type { PlanLimits } from "../types";

export function getLimits(plan: PlanTier): PlanLimits {
  return project.planLimits[plan] as PlanLimits;
}

export function assertMemberLimit(plan: PlanTier, currentCount: number): void {
  const limits = getLimits(plan);
  if (limits.maxMembers !== null && currentCount >= limits.maxMembers) {
    throw new PaymentRequiredError(
      `Your plan allows a maximum of ${limits.maxMembers} members. Upgrade to add more.`
    );
  }
}

export function assertFeatureAvailable(plan: PlanTier, feature: "ssoEnabled" | "prioritySupport"): void {
  const limits = getLimits(plan);
  if (!limits[feature]) {
    throw new PaymentRequiredError(
      `The '${feature}' feature is not available on your current plan. Please upgrade.`
    );
  }
}
