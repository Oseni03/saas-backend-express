import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

vi.mock("../../src/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function registerAndLogin(
  email: string,
  password = "Secure1234!"
): Promise<string> {
  await request(app).post("/api/v1/auth/register").send({ email, password, fullName: "Test User" });
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return res.body.accessToken as string;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("GET /api/v1/users/me", () => {
  it("returns profile for authenticated user", async () => {
    const token = await registerAndLogin("me@example.com");
    const res = await request(app).get("/api/v1/users/me").set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@example.com");
    expect(res.body.fullName).toBe("Test User");
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("mfaSecret");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/users/me", () => {
  it("updates full name and avatar", async () => {
    const token = await registerAndLogin("update@example.com");
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(bearer(token))
      .send({ fullName: "Updated Name", avatarUrl: "https://example.com/avatar.png" });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe("Updated Name");
    expect(res.body.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("ignores unknown fields", async () => {
    const token = await registerAndLogin("safe@example.com");
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(bearer(token))
      .send({ fullName: "Safe User", isAdmin: true, isSuperuser: true });

    expect(res.status).toBe(200);
    // Injected privilege escalation fields must NOT be persisted
    expect(res.body.isSuperuser).toBe(false);
  });

  it("returns 422 for invalid avatar URL", async () => {
    const token = await registerAndLogin("badurl@example.com");
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(bearer(token))
      .send({ avatarUrl: "not-a-url" });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/users/me/change-password", () => {
  it("changes password successfully", async () => {
    const email = "chpwd@example.com";
    const token = await registerAndLogin(email, "OldPass1234!");

    const res = await request(app)
      .post("/api/v1/users/me/change-password")
      .set(bearer(token))
      .send({ currentPassword: "OldPass1234!", newPassword: "NewPass5678!" });

    expect(res.status).toBe(204);

    // Old password should no longer work
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "OldPass1234!" });
    expect(loginRes.status).toBe(401);

    // New password should work
    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "NewPass5678!" });
    expect(newLogin.status).toBe(200);
  });

  it("returns 401 for wrong current password", async () => {
    const token = await registerAndLogin("wrongpwd@example.com");
    const res = await request(app)
      .post("/api/v1/users/me/change-password")
      .set(bearer(token))
      .send({ currentPassword: "WrongPass1!", newPassword: "NewPass5678!" });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/v1/users/me", () => {
  it("deactivates the account", async () => {
    const email = "delete@example.com";
    const token = await registerAndLogin(email);

    const res = await request(app).delete("/api/v1/users/me").set(bearer(token));
    expect(res.status).toBe(204);

    // Deactivated user cannot log in
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Secure1234!" });
    expect(loginRes.status).toBe(401);
  });
});
