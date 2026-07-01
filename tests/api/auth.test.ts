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
      full_name: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.is_verified).toBe(false);
    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("refresh_token");
    expect(res.body.token_type).toBe("Bearer");
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
    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("refresh_token");
    expect(res.body.token_type).toBe("Bearer");
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
      .set("Authorization", `Bearer ${loginRes.body.access_token}`);

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
      .send({ refresh_token: loginRes.body.refresh_token });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("access_token");
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

describe("GET /api/v1/auth/oauth/google", () => {
  it("returns authorization_url for Google OAuth", async () => {
    const res = await request(app).get("/api/v1/auth/oauth/google");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("authorization_url");
    expect(res.body.authorization_url).toMatch(
      /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/
    );
    expect(res.body.authorization_url).toContain("client_id=");
    expect(res.body.authorization_url).toContain("redirect_uri=");
    expect(res.body.authorization_url).toContain("response_type=code");
    expect(res.body.authorization_url).toContain("scope=openid");
  });
});

describe("GET /api/v1/auth/oauth/github", () => {
  it("returns authorization_url for GitHub OAuth", async () => {
    const res = await request(app).get("/api/v1/auth/oauth/github");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("authorization_url");
    expect(res.body.authorization_url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    expect(res.body.authorization_url).toContain("client_id=");
    expect(res.body.authorization_url).toContain("redirect_uri=");
    expect(res.body.authorization_url).toContain("scope=");
  });
});

describe("MFA pending token flow", () => {
  it("login without MFA returns TokenPair", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "nomfa@example.com",
      password: "Secure1234!",
      full_name: "No MFA User",
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nomfa@example.com", password: "Secure1234!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("access_token");
    expect(loginRes.body).toHaveProperty("refresh_token");
    expect(loginRes.body.token_type).toBe("Bearer");
    expect(loginRes.body).not.toHaveProperty("mfa_pending");
  });

  it("login with MFA enabled returns mfa_pending token", async () => {
    // First register a user
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "mfauser@example.com",
      password: "Secure1234!",
      full_name: "MFA User",
    });

    const userId = registerRes.body.user.id;
    const accessToken = registerRes.body.access_token;

    // Setup MFA
    const setupRes = await request(app)
      .post("/api/v1/mfa/setup")
      .set("Authorization", `Bearer ${accessToken}`);

    const secret = setupRes.body.secret;

    // Verify MFA setup
    const { authenticator } = await import("otplib");
    const code = authenticator.generate(secret);

    await request(app)
      .post("/api/v1/mfa/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ code });

    // Now login should return mfa_pending token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "mfauser@example.com", password: "Secure1234!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("mfa_pending");
    expect(loginRes.body.mfa_pending).toBeDefined();
    expect(loginRes.body.expires_in).toBe(300);
    expect(loginRes.body).not.toHaveProperty("access_token");
    expect(loginRes.body).not.toHaveProperty("refresh_token");
  });

  it("mfa_pending token can be used to validate MFA", async () => {
    // Register and setup MFA
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "mfavalidate@example.com",
      password: "Secure1234!",
      full_name: "MFA Validate User",
    });

    const accessToken = registerRes.body.access_token;

    const setupRes = await request(app)
      .post("/api/v1/mfa/setup")
      .set("Authorization", `Bearer ${accessToken}`);

    const secret = setupRes.body.secret;

    const { authenticator } = await import("otplib");
    const code = authenticator.generate(secret);

    await request(app)
      .post("/api/v1/mfa/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ code });

    // Login to get mfa_pending token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "mfavalidate@example.com", password: "Secure1234!" });

    const mfaPendingToken = loginRes.body.mfa_pending;

    // Use mfa_pending token to validate MFA
    const mfaCode = authenticator.generate(secret);
    const validateRes = await request(app)
      .post("/api/v1/mfa/validate")
      .set("Authorization", `Bearer ${mfaPendingToken}`)
      .query({ code: mfaCode });

    expect(validateRes.status).toBe(200);
    expect(validateRes.body).toHaveProperty("access_token");
    expect(validateRes.body).toHaveProperty("refresh_token");
    expect(validateRes.body.token_type).toBe("Bearer");
  });

  it("returns 422 when code query parameter is missing", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "missingcode@example.com",
      password: "Secure1234!",
    });

    const accessToken = registerRes.body.access_token;

    const res = await request(app)
      .post("/api/v1/mfa/verify")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it("returns 422 when code query parameter is invalid length", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      email: "invalidcode@example.com",
      password: "Secure1234!",
    });

    const accessToken = registerRes.body.access_token;

    const res = await request(app)
      .post("/api/v1/mfa/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ code: "12345" }); // 5 digits instead of 6

    expect(res.status).toBe(422);
  });
});
