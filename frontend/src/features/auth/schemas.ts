import { z } from "zod";

export const customerSignUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    drivers_license: z.string().optional(),
    date_of_birth: z.string().optional(),
    address: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ownerSignUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    owner_type: z.enum(["individual", "fleet"], {
      message: "Select ownership type",
    }),
    fleet_name: z.string().optional(),
    national_id: z.string().optional(),
    location: z.string().optional(),
    rc_number: z.string().optional(),
    bank_account: z.string().min(1, "Bank account is required"),
    bank_name: z.string().min(1, "Bank name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Access code must be 6 digits"),
  purpose: z.enum(["sign_in", "sign_up_verify"]),
});

export type CustomerSignUpInput = z.infer<typeof customerSignUpSchema>;
export type OwnerSignUpInput = z.infer<typeof ownerSignUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
