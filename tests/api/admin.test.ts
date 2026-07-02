import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";

// Mock email sending so tests don't need real Resend keys
vi.mock("../../src/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

describe("Admin endpoints - requireAdmin middleware", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/admin/stats");
    expect(res.status).toBe(401);
  });

  it("returns 403 for authenticated non-admin users", async () => {
    // Register a regular user
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "regularuser@example.com",
      password: "Secure1234!",
    });

    const accessToken = registerRes.body.access_token;

    // Try to access admin endpoint
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("Admin");
  });

  it("allows system-level admin (superuser) to access admin endpoints", async () => {
    // Create a superuser directly
    const superuser = await prisma.user.create({
      data: {
        email: "superuser@example.com",
        hashedPassword: "dummy",
        isSuperuser: true,
        isVerified: true,
        isActive: true,
      },
    });

    const { signAccessToken } = await import("../../src/lib/jwt");
    const accessToken = signAccessToken(superuser.id);

    // Access admin endpoint
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body).toHaveProperty("organizations");

    // Cleanup
    await prisma.user.delete({ where: { id: superuser.id } });
  });

  it("allows organization admin to access admin endpoints", async () => {
    // Register a regular user
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "orgadmin@example.com",
      password: "Secure1234!",
      full_name: "Org Admin",
    });

    const userId = registerRes.body.user.id;
    const accessToken = registerRes.body.access_token;

    // Create an organization
    const orgRes = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Test Admin Org",
        slug: "test-admin-org",
      });

    const orgId = orgRes.body.id;

    // User should now be org admin (creator is auto-added as admin)
    // Try to access admin endpoint
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body).toHaveProperty("organizations");

    // Cleanup
    await prisma.organization.delete({ where: { id: orgId } });
  });

  it("GET /api/v1/admin/stats returns statistics", async () => {
    // Create a superuser
    const superuser = await prisma.user.create({
      data: {
        email: "stats-admin@example.com",
        hashedPassword: "dummy",
        isSuperuser: true,
        isVerified: true,
        isActive: true,
      },
    });

    const { signAccessToken } = await import("../../src/lib/jwt");
    const accessToken = signAccessToken(superuser.id);

    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveProperty("total");
    expect(res.body.users).toHaveProperty("verified");
    expect(res.body.organizations).toHaveProperty("total");
    expect(typeof res.body.users.total).toBe("number");
    expect(typeof res.body.users.verified).toBe("number");
    expect(typeof res.body.organizations.total).toBe("number");

    // Cleanup
    await prisma.user.delete({ where: { id: superuser.id } });
  });

  it("GET /api/v1/admin/users returns user list", async () => {
    // Create a superuser
    const superuser = await prisma.user.create({
      data: {
        email: "users-admin@example.com",
        hashedPassword: "dummy",
        isSuperuser: true,
        isVerified: true,
        isActive: true,
      },
    });

    const { signAccessToken } = await import("../../src/lib/jwt");
    const accessToken = signAccessToken(superuser.id);

    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Cleanup
    await prisma.user.delete({ where: { id: superuser.id } });
  });

  it("GET /api/v1/admin/organizations returns org list", async () => {
    // Create a superuser
    const superuser = await prisma.user.create({
      data: {
        email: "orgs-admin@example.com",
        hashedPassword: "dummy",
        isSuperuser: true,
        isVerified: true,
        isActive: true,
      },
    });

    const { signAccessToken } = await import("../../src/lib/jwt");
    const accessToken = signAccessToken(superuser.id);

    const res = await request(app)
      .get("/api/v1/admin/organizations")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Cleanup
    await prisma.user.delete({ where: { id: superuser.id } });
  });
});
