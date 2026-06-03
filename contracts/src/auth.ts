import { z } from "zod";

export const signUpRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(["customer", "owner"]),
  fleetName: z.string().optional(),
});

export const signInRequestSchema = z.object({
  email: z.string().email(),
});

export const pushAuthChallengeSchema = z.object({
  challengeId: z.string(),
  expiresAt: z.string(),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
});

export const accessCodeVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
  role: z.enum(["customer", "owner"]),
  expiresIn: z.number(),
});

export type SignUpRequest = z.infer<typeof signUpRequestSchema>;
export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type PushAuthChallenge = z.infer<typeof pushAuthChallengeSchema>;
export type AccessCodeVerify = z.infer<typeof accessCodeVerifySchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
