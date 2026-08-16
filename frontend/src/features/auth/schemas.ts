import { z } from "zod";

/** Accepted means of identification. Shared by sign-up, profile, and the
 * booking representative flow. */
export const ID_TYPE_OPTIONS = [
  { value: "intl_passport", label: "International Passport" },
  { value: "nin", label: "NIN" },
  { value: "voters_card", label: "Voter's Card" },
  { value: "drivers_licence", label: "Driver's Licence" },
] as const;

export const ID_TYPE_VALUES = [
  "intl_passport",
  "nin",
  "voters_card",
  "drivers_licence",
] as const;

export const idTypeLabel = (value?: string) =>
  ID_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? "";

/** Human-readable password policy — show this under every password field.
 * Kept in sync with the backend PasswordComplexityValidator. */
export const PASSWORD_HINT =
  "Must be at least 8 characters, including an uppercase letter, a lowercase letter, and a number or symbol.";

/** Shared password policy: 8–128 chars, an uppercase, a lowercase, and a number
 * or symbol (either satisfies). Used by sign-up, reset, and change-password. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9\p{P}\p{S}]/u, "Include at least one number or symbol");

const isBlank = (value?: string) => !value?.trim();
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d*$/, "Phone number must contain digits only")
  .optional();
// Registration requires a phone number (customers and owners alike).
const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(/^\d+$/, "Phone number must contain digits only");

export const customerSignUpSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters"),
    last_name: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    phone: requiredPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
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
    first_name: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters"),
    last_name: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    phone: requiredPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    owner_type: z.enum(["individual", "fleet"], {
      message: "Select ownership type",
    }),
    fleet_name: z.string().trim().optional(),
    id_type: z.enum(ID_TYPE_VALUES, {
      message: "Select a means of identification",
    }),
    national_id: z.string().trim().min(1, "ID number is required"),
    location: z.string().trim().optional(),
    address: z.string().trim().optional(),
    rc_number: z.string().trim().optional(),
    country: z.string().trim().optional(),
    state: z.string().trim().optional(),
    city: z.string().trim().optional(),
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
      if (isBlank(data.address)) {
        ctx.addIssue({
          code: "custom",
          message: "Address is required",
          path: ["address"],
        });
      }
    }

    // A NIN is all digits; other ID types (passport, licence) allow letters.
    if (data.id_type === "nin" && !/^\d+$/.test(data.national_id)) {
      ctx.addIssue({
        code: "custom",
        message: "NIN must contain digits only",
        path: ["national_id"],
      });
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

export const profileUpdateSchema = z.object({
  first_name: z.string().trim().min(2, "First name required"),
  last_name: z.string().trim().min(2, "Last name required"),
  phone: phoneSchema,
  // Customer fields
  drivers_license: z.string().trim().optional(),
  date_of_birth: z.string().trim().optional(),
  address: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export const ownerProfileUpdateSchema = z.object({
  first_name: z.string().trim().min(2, "First name required"),
  last_name: z.string().trim().min(2, "Last name required"),
  phone: phoneSchema,
  // Owner fields
  fleet_name: z.string().trim().optional(),
  location: z.string().trim().optional(),
  rc_number: z.string().trim().optional(),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Current password required"),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
