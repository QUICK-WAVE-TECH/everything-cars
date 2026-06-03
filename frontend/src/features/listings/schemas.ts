import { z } from "zod";

export const carSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  color: z.string(),
  pricePerDay: z.number(),
  location: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  isAvailable: z.boolean(),
  createdAt: z.string(),
});

export const searchFiltersSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type Car = z.infer<typeof carSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
