import { z } from "zod";

const isBlank = (value?: string) => !value?.trim();
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d*$/, "Phone number must contain digits only")
  .optional();

export const customerSignUpSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name must be at least 2 characters"),
    last_name: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    phone: phoneSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    drivers_license: z.string().trim().optional(),
    date_of_birth: z.string().trim().optional(),
    address: z.string().trim().optional(),
    state: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ownerSignUpSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name must be at least 2 characters"),
    last_name: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    phone: phoneSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    owner_type: z.enum(["individual", "fleet"], {
      message: "Select ownership type",
    }),
    fleet_name: z.string().trim().optional(),
    national_id: z.string().trim().optional(),
    location: z.string().trim().optional(),
    rc_number: z.string().trim().optional(),
    country: z.string().trim().optional(),
    state: z.string().trim().optional(),
    city: z.string().trim().optional(),
    bank_account: z.string().trim().min(1, "Bank account is required"),
    bank_name: z.string().trim().min(1, "Bank name is required"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }

    if (data.owner_type === "fleet") {
      if (isBlank(data.fleet_name)) {
        ctx.addIssue({
          code: "custom",
          message: "Company name is required",
          path: ["fleet_name"],
        });
      }

      if (isBlank(data.rc_number)) {
        ctx.addIssue({
          code: "custom",
          message: "Company registration number is required",
          path: ["rc_number"],
        });
      }
    }

    if (data.owner_type === "individual") {
      if (isBlank(data.location)) {
        ctx.addIssue({
          code: "custom",
          message: "Location is required",
          path: ["location"],
        });
      }

      if (isBlank(data.national_id)) {
        ctx.addIssue({
          code: "custom",
          message: "National ID is required",
          path: ["national_id"],
        });
      }
    }
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().length(6, "Access code must be 6 digits"),
  purpose: z.enum(["sign_in", "sign_up_verify"]),
});

export type CustomerSignUpInput = z.infer<typeof customerSignUpSchema>;
export type OwnerSignUpInput = z.infer<typeof ownerSignUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
