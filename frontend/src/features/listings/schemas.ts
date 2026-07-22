import { z } from "zod";

import {
  normalizePlate,
  normalizeVin,
  validatePlate,
  validateVin,
} from "@/features/listings/lib/vehicle-identity";

const currentYear = new Date().getFullYear();

const decimalString = (msg: string) =>
  z.string().trim().refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v), msg).optional();

const digitsOnly = (msg: string) =>
  z.string().trim().refine((v) => !v || /^\d+$/.test(v), msg).optional();

const createCarBase = z.object({
  title: z.string().trim().min(2, "Title is required"),
  // A car is listed for rent XOR buy — never both.
  listing_type: z.enum(["rent", "buy"], {
    message: "Select listing type",
  }),
  rent_price_per_day: decimalString("Price must be a valid number (e.g. 35000 or 35000.50)"),
  sale_price: decimalString("Price must be a valid number (e.g. 24000000 or 24000000.00)"),
  // Buy listings only. When negotiable, the owner sets a private min/max range
  // that customers never see.
  is_negotiable: z.boolean().optional(),
  min_price: decimalString("Enter a valid amount"),
  max_price: decimalString("Enter a valid amount"),
  // Normalized here; the format/length rules are asserted in the superRefine
  // below so the message can name the exact problem.
  vin: z.string().trim().transform(normalizeVin),
  plate_number: z.string().trim().transform(normalizePlate),
  currency: z.string().default("NGN"),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  color: z.string().trim().optional(),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Year must be 4 digits (e.g. 2024)")
    .refine((v) => {
      const year = Number(v);
      return year >= 1900 && year <= currentYear + 1;
    }, `Year must be between 1900 and ${currentYear + 1}`),
  body_type: z.string().trim().optional(),
  transmission: z.string().trim().optional(),
  fuel_type: z.string().trim().optional(),
  seats: z.coerce
    .number()
    .int("Seats must be a whole number")
    .min(1, "Seats must be at least 1")
    .max(60, "Seats must be 60 or fewer")
    .default(5),
  mileage: digitsOnly("Mileage must be a number"),
  country: z.string().trim().optional(),
  state: z.string().trim().min(1, "State is required"),
  city: z.string().trim().optional(),
  description: z.string().trim().optional(),
  features: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Feature name required"),
        value: z.string().trim().optional(),
      }),
    )
    .optional(),
});

export const createCarSchema = createCarBase.superRefine((data, ctx) => {
  const vinError = validateVin(data.vin);
  if (vinError) {
    ctx.addIssue({ code: "custom", message: vinError, path: ["vin"] });
  }
  const plateError = validatePlate(data.plate_number);
  if (plateError) {
    ctx.addIssue({ code: "custom", message: plateError, path: ["plate_number"] });
  }

  if (data.listing_type === "rent") {
    if (!data.rent_price_per_day) {
      ctx.addIssue({
        code: "custom",
        message: "Rental price is required for this listing type",
        path: ["rent_price_per_day"],
      });
    }
    return;
  }

  // Buy listing
  if (!data.sale_price) {
    ctx.addIssue({
      code: "custom",
      message: "Sale price is required for this listing type",
      path: ["sale_price"],
    });
  }
  if (data.is_negotiable !== true) return;

  // Negotiable buy listings must declare a private, ordered range.
  if (!data.min_price || !data.max_price) {
    ctx.addIssue({
      code: "custom",
      message: "Enter both a minimum and a maximum",
      path: ["min_price"],
    });
    return;
  }
  if (Number(data.min_price) > Number(data.max_price)) {
    ctx.addIssue({
      code: "custom",
      message: "Minimum must be less than or equal to maximum",
      path: ["min_price"],
    });
  }
});

export type CreateCarFormValues = z.input<typeof createCarSchema>;
export type CreateCarInput = z.infer<typeof createCarSchema>;
