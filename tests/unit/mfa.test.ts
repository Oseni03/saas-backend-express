import { describe, it, expect, vi } from "vitest";
import { authenticator } from "otplib";

// Test the MFA TOTP logic directly without HTTP layer
describe("MFA TOTP logic", () => {
  it("generates a valid secret", () => {
    const secret = authenticator.generateSecret();
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(10);
  });

  it("generates and verifies a valid TOTP code", () => {
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    expect(authenticator.verify({ token: code, secret })).toBe(true);
  });

  it("rejects an incorrect TOTP code", () => {
    const secret = authenticator.generateSecret();
    expect(authenticator.verify({ token: "000000", secret })).toBe(false);
  });

  it("produces a valid otpauth URI", () => {
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri("test@example.com", "TestApp", secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("test%40example.com");
    expect(uri).toContain("TestApp");
    expect(uri).toContain(`secret=${secret}`);
  });
});
