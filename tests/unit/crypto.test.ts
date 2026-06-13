import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken, hashToken, verifyTokenHash } from "../../src/lib/crypto";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../src/lib/jwt";

describe("crypto utils", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("MyPass1!");
    expect(hash).not.toBe("MyPass1!");
    expect(await verifyPassword("MyPass1!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, generateToken));
    expect(tokens.size).toBe(50);
  });

  it("hashes tokens deterministically", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
  });

  it("verifies token hashes correctly", () => {
    const t = generateToken();
    const h = hashToken(t);
    expect(verifyTokenHash(t, h)).toBe(true);
    expect(verifyTokenHash("tampered", h)).toBe(false);
  });
});

describe("JWT utils", () => {
  const userId = "user_test_123";

  it("issues and verifies access tokens", () => {
    const token = signAccessToken(userId);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(userId);
    expect(payload.type).toBe("access");
  });

  it("issues and verifies refresh tokens", () => {
    const token = signRefreshToken(userId);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(userId);
    expect(payload.type).toBe("refresh");
  });

  it("rejects access token used as refresh", () => {
    const token = signAccessToken(userId);
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it("rejects refresh token used as access", () => {
    const token = signRefreshToken(userId);
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
