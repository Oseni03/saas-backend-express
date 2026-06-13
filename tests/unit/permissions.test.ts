import { describe, it, expect } from "vitest";
import { PlanTier } from "@prisma/client";
import { getLimits, assertMemberLimit, assertFeatureAvailable } from "../../src/services/permissionsService";
import { PaymentRequiredError } from "../../src/middleware/errors";

describe("permissionsService", () => {
  it("returns correct limits for FREE plan", () => {
    const limits = getLimits(PlanTier.FREE);
    expect(limits.maxMembers).toBe(5);
    expect(limits.ssoEnabled).toBe(false);
    expect(limits.auditLogRetentionDays).toBe(7);
  });

  it("returns correct limits for PRO plan", () => {
    const limits = getLimits(PlanTier.PRO);
    expect(limits.maxMembers).toBe(50);
    expect(limits.prioritySupport).toBe(true);
  });

  it("ENTERPRISE has unlimited members", () => {
    const limits = getLimits(PlanTier.ENTERPRISE);
    expect(limits.maxMembers).toBeNull();
    expect(limits.ssoEnabled).toBe(true);
    expect(limits.mfaRequired).toBe(true);
  });

  it("throws when at FREE member limit", () => {
    expect(() => assertMemberLimit(PlanTier.FREE, 5)).toThrow(PaymentRequiredError);
  });

  it("does not throw below FREE member limit", () => {
    expect(() => assertMemberLimit(PlanTier.FREE, 4)).not.toThrow();
  });

  it("never throws for ENTERPRISE member limit", () => {
    expect(() => assertMemberLimit(PlanTier.ENTERPRISE, 99999)).not.toThrow();
  });

  it("blocks SSO on FREE plan", () => {
    expect(() => assertFeatureAvailable(PlanTier.FREE, "sso")).toThrow(PaymentRequiredError);
  });

  it("allows SSO on ENTERPRISE plan", () => {
    expect(() => assertFeatureAvailable(PlanTier.ENTERPRISE, "sso")).not.toThrow();
  });
});
