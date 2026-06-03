import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["customer", "owner"]),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const accessCodeSchema = z.object({
  code: z.string().length(6, "Access code must be 6 digits"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type AccessCodeInput = z.infer<typeof accessCodeSchema>;
