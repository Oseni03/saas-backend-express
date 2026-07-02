import { describe, it, expect } from "vitest";
import { generateSecret, generate, verify, generateURI } from "otplib";

describe("MFA TOTP logic", () => {
  it("generates a valid secret", () => {
    const secret = generateSecret();
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(10);
  });

  it("generates and verifies a valid TOTP code", () => {
    const secret = generateSecret();
    const code = generate(secret);
    expect(verify({ token: code, secret })).toBe(true);
  });

  it("rejects an incorrect TOTP code", () => {
    const secret = generateSecret();
    expect(verify({ token: "000000", secret })).toBe(false);
  });

  it("produces a valid otpauth URI", () => {
    const secret = generateSecret();
    const uri = generateURI({ label: "test@example.com", issuer: "TestApp", secret });
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("test%40example.com");
    expect(uri).toContain("TestApp");
    expect(uri).toContain(`secret=${secret}`);
  });
});
