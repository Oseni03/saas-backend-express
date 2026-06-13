import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

// Mock email sending so tests don't need real Resend keys
vi.mock("../../src/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

describe("POST /api/v1/auth/register", () => {
  it("creates a user and returns 201", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "test@example.com",
      password: "Secure1234!",
      fullName: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("test@example.com");
    expect(res.body.isVerified).toBe(false);
    expect(res.body).not.toHaveProperty("hashedPassword");
  });

  it("returns 409 for duplicate email", async () => {
    const payload = { email: "dup@example.com", password: "Secure1234!" };
    await request(app).post("/api/v1/auth/register").send(payload);
    const res = await request(app).post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(409);
  });

  it("returns 422 for weak password", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "weak@example.com",
      password: "short",
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "not-an-email",
      password: "Secure1234!",
    });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/auth/login", () => {
  const creds = { email: "login@example.com", password: "Secure1234!" };

  it("returns token pair on success", async () => {
    await request(app).post("/api/v1/auth/register").send(creds);
    const res = await request(app).post("/api/v1/auth/login").send(creds);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.tokenType).toBe("Bearer");
  });

  it("returns 401 for wrong password", async () => {
    await request(app).post("/api/v1/auth/register").send(creds);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ ...creds, password: "WrongPass1!" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@example.com",
      password: "Secure1234!",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the current user", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "me@example.com", password: "Secure1234!" });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "me@example.com", password: "Secure1234!" });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@example.com");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("issues new token pair from refresh token", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "refresh@example.com", password: "Secure1234!" });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "refresh@example.com", password: "Secure1234!" });

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: loginRes.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  it("returns 202 regardless of whether email exists", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "ghost@example.com" });
    expect(res.status).toBe(202);
  });
});
