import { z } from "zod";

export const rentalRequestSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  carId: z.string(),
  ownerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalPrice: z.number(),
  status: z.enum(["pending", "approved", "rejected", "paid", "active", "completed", "cancelled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createRequestSchema = z.object({
  carId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  message: z.string().optional(),
});

export type RentalRequest = z.infer<typeof rentalRequestSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
