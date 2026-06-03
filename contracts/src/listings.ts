import { z } from "zod";

export const carSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
  ownerType: z.enum(["individual", "fleet"]),
  make: z.string(),
  model: z.string(),
  year: z.number().min(1990).max(2030),
  color: z.string(),
  pricePerDay: z.number().positive(),
  location: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  features: z.array(z.string()),
  isAvailable: z.boolean(),
  createdAt: z.string(),
});

export const createCarRequestSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1990).max(2030),
  color: z.string().min(1),
  pricePerDay: z.number().positive(),
  location: z.string().min(1),
  description: z.string().min(10),
  features: z.array(z.string()).default([]),
});

export const searchFiltersSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

export type Car = z.infer<typeof carSchema>;
export type CreateCarRequest = z.infer<typeof createCarRequestSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
