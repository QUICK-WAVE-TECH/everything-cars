import { describe, it, expect } from "vitest";
import { signUpRequestSchema, signInRequestSchema, tokenResponseSchema } from "../auth";

describe("auth contracts", () => {
  it("validates a valid sign-up request", () => {
    const result = signUpRequestSchema.safeParse({
      email: "user@example.com", name: "John Doe", phone: "+1234567890", role: "customer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects sign-up with invalid email", () => {
    const result = signUpRequestSchema.safeParse({
      email: "not-an-email", name: "John", role: "customer",
    });
    expect(result.success).toBe(false);
  });

  it("validates a valid sign-in request", () => {
    const result = signInRequestSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("validates a token response", () => {
    const result = tokenResponseSchema.safeParse({
      accessToken: "eyJ...", refreshToken: "eyJ...", userId: "user-123", role: "customer", expiresIn: 900,
    });
    expect(result.success).toBe(true);
  });
});
