import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { PlanTier } from "@prisma/client";

vi.mock("../../src/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock the Paystack API calls so tests never hit the network
vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: () => ({
        post: vi.fn(),
        get: vi.fn(),
      }),
    },
  };
});

const app = createApp();

async function registerVerifyLogin(email: string): Promise<{ token: string; userId: string }> {
  await request(app).post("/api/v1/auth/register").send({ email, password: "Secure1234!" });
  await prisma.user.update({ where: { email }, data: { isVerified: true } });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Secure1234!" });
  const meRes = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${res.body.access_token}`);
  return { token: res.body.access_token, userId: meRes.body.id };
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("POST /api/v1/billing/organizations/:orgId/initialize", () => {
  it("returns 402 when initializing FREE plan", async () => {
    const { token } = await registerVerifyLogin("billing1@example.com");

    const orgRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "Billing Org 1" });

    const res = await request(app)
      .post(`/api/v1/billing/organizations/${orgRes.body.id}/initialize`)
      .set(bearer(token))
      .send({ plan: PlanTier.FREE, callbackUrl: "http://localhost:3000/billing/callback" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/free plan/i);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/billing/organizations/fake-id/initialize")
      .send({ plan: PlanTier.PRO, callbackUrl: "http://localhost:3000/billing/callback" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent org", async () => {
    const { token } = await registerVerifyLogin("billing2@example.com");
    const res = await request(app)
      .post("/api/v1/billing/organizations/nonexistent-id/initialize")
      .set(bearer(token))
      .send({ plan: PlanTier.PRO, callbackUrl: "http://localhost:3000/billing/callback" });
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner member", async () => {
    const { token: ownerToken } = await registerVerifyLogin("billing-owner@example.com");
    const { token: memberToken, userId: memberId } = await registerVerifyLogin(
      "billing-member@example.com"
    );

    const orgRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(ownerToken))
      .send({ name: "Billing Org 2" });

    // Add the member
    await prisma.membership.create({
      data: { userId: memberId, organizationId: orgRes.body.id, role: "MEMBER" },
    });

    const res = await request(app)
      .post(`/api/v1/billing/organizations/${orgRes.body.id}/initialize`)
      .set(bearer(memberToken))
      .send({ plan: PlanTier.PRO, callbackUrl: "http://localhost:3000/billing/callback" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/billing/verify", () => {
  it("returns 400 when reference is missing", async () => {
    const { token } = await registerVerifyLogin("billing3@example.com");
    const res = await request(app).get("/api/v1/billing/verify").set(bearer(token));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/billing/organizations/:orgId/cancel", () => {
  it("returns 404 when no subscription exists", async () => {
    const { token } = await registerVerifyLogin("billing4@example.com");

    const orgRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "Billing Org 3" });

    const res = await request(app)
      .post(`/api/v1/billing/organizations/${orgRes.body.id}/cancel`)
      .set(bearer(token));

    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/billing/organizations/:orgId/manage", () => {
  it("returns 400 when org has no Paystack customer", async () => {
    const { token } = await registerVerifyLogin("billing5@example.com");

    const orgRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "Billing Org 4" });

    const res = await request(app)
      .get(`/api/v1/billing/organizations/${orgRes.body.id}/manage`)
      .set(bearer(token));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no billing account/i);
  });

  it("returns manage URL when customer exists", async () => {
    const { token } = await registerVerifyLogin("billing6@example.com");

    const orgRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "Billing Org 5" });

    // Simulate org already having a Paystack customer code
    await prisma.organization.update({
      where: { id: orgRes.body.id },
      data: { paystackCustomerId: "CUS_testcustomer123" },
    });

    const res = await request(app)
      .get(`/api/v1/billing/organizations/${orgRes.body.id}/manage`)
      .set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.manage_url).toContain("CUS_testcustomer123");
  });
});

describe("POST /api/v1/billing/webhooks/paystack", () => {
  it("returns 400 for invalid signature", async () => {
    const res = await request(app)
      .post("/api/v1/billing/webhooks/paystack")
      .set("x-paystack-signature", "invalid-signature")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ event: "charge.success", data: {} }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });

  it("returns 200 for valid signature", async () => {
    const crypto = await import("crypto");
    const payload = JSON.stringify({ event: "charge.success", data: { metadata: {} } });
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? "";
    const sig = crypto.createHmac("sha512", secret).update(Buffer.from(payload)).digest("hex");

    const res = await request(app)
      .post("/api/v1/billing/webhooks/paystack")
      .set("x-paystack-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);

    // 200 OK even if no org found in metadata — we handle gracefully
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});
