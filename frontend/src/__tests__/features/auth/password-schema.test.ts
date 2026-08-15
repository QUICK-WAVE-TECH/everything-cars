import { describe, expect, it } from "vitest";

import { passwordSchema } from "@/features/auth/schemas";

const ok = (pw: string) => passwordSchema.safeParse(pw).success;

describe("passwordSchema", () => {
  it("accepts a compliant password", () => {
    expect(ok("SecurePass123!")).toBe(true);
    expect(ok("Abcdefg1")).toBe(true); // letters + a digit is enough
    expect(ok("Abcdefg!")).toBe(true); // letters + a symbol is enough
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(ok("Ab1!")).toBe(false);
  });

  it("rejects a password longer than 128 characters", () => {
    expect(ok("Aa1" + "a".repeat(130))).toBe(false);
  });

  it("requires an uppercase letter", () => {
    expect(ok("securepass123!")).toBe(false);
  });

  it("requires a lowercase letter", () => {
    expect(ok("SECUREPASS123!")).toBe(false);
  });

  it("requires a number or symbol", () => {
    expect(ok("SecurePassword")).toBe(false);
  });
});
