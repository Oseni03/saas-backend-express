import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

vi.mock("../../src/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function registerAndLogin(email: string): Promise<string> {
  await request(app).post("/api/v1/auth/register").send({ email, password: "Secure1234!" });

  // Force verify the user so org creation works
  const { prisma } = await import("../../src/lib/prisma");
  await prisma.user.update({ where: { email }, data: { isVerified: true } });

  const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Secure1234!" });
  return res.body.accessToken as string;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("POST /api/v1/organizations", () => {
  it("creates an org and makes user the owner", async () => {
    const token = await registerAndLogin("owner@example.com");
    const res = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "Acme Corp" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Acme Corp");
    expect(res.body.slug).toBe("acme-corp");
    expect(res.body.plan).toBe("FREE");
  });

  it("returns 403 for unverified user", async () => {
    // Register but don't verify
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "unverified@example.com", password: "Secure1234!" });
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "unverified@example.com", password: "Secure1234!" });

    const res = await request(app)
      .post("/api/v1/organizations")
      .set({ Authorization: `Bearer ${loginRes.body.accessToken}` })
      .send({ name: "Should Fail" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/organizations", () => {
  it("returns empty array when user has no orgs", async () => {
    const token = await registerAndLogin("noorg@example.com");
    const res = await request(app).get("/api/v1/organizations").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns orgs the user belongs to", async () => {
    const token = await registerAndLogin("orglister@example.com");
    await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "My Org" });

    const res = await request(app).get("/api/v1/organizations").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("My Org");
  });
});

describe("PATCH /api/v1/organizations/:orgId", () => {
  it("updates org name", async () => {
    const token = await registerAndLogin("updater@example.com");
    const createRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "Old Name" });

    const res = await request(app)
      .patch(`/api/v1/organizations/${createRes.body.id}`)
      .set(bearer(token))
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
  });
});

describe("DELETE /api/v1/organizations/:orgId", () => {
  it("deletes org as owner", async () => {
    const token = await registerAndLogin("deleter@example.com");
    const createRes = await request(app)
      .post("/api/v1/organizations")
      .set(bearer(token))
      .send({ name: "To Delete" });

    const res = await request(app)
      .delete(`/api/v1/organizations/${createRes.body.id}`)
      .set(bearer(token));

    expect(res.status).toBe(204);
  });
});

describe("Invitation flow", () => {
  it("rejects invalid invitation token", async () => {
    const token = await registerAndLogin("invitee@example.com");
    const res = await request(app)
      .post("/api/v1/organizations/invitations/accept")
      .set(bearer(token))
      .send({ token: "invalid-token" });

    expect(res.status).toBe(400);
  });
});
