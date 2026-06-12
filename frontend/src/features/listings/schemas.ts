import { z } from "zod";

export const createCarSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required"),
    listing_type: z.enum(["rent", "buy", "both"], {
      message: "Select listing type",
    }),
    rent_price_per_day: z.string().trim().optional(),
    sale_price: z.string().trim().optional(),
    currency: z.string().default("NGN"),
    brand: z.string().trim().min(1, "Brand is required"),
    model: z.string().trim().min(1, "Model is required"),
    color: z.string().trim().optional(),
    year: z.string().trim().min(4, "Year is required"),
    body_type: z.string().trim().optional(),
    transmission: z.string().trim().optional(),
    fuel_type: z.string().trim().optional(),
    seats: z.coerce.number().int().min(1).default(5),
    mileage: z.string().trim().optional(),
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
  })
  .superRefine((data, ctx) => {
    if (
      (data.listing_type === "rent" || data.listing_type === "both") &&
      !data.rent_price_per_day
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Rental price is required for this listing type",
        path: ["rent_price_per_day"],
      });
    }
    if (
      (data.listing_type === "buy" || data.listing_type === "both") &&
      !data.sale_price
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Sale price is required for this listing type",
        path: ["sale_price"],
      });
    }
  });

export type CreateCarInput = z.infer<typeof createCarSchema>;
