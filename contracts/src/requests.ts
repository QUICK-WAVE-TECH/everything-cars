import { z } from "zod";

export const requestStatusSchema = z.enum([
  "pending", "approved", "rejected", "paid", "active", "completed", "cancelled",
]);

export const rentalRequestSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  carId: z.string(),
  carSummary: z.string(),
  ownerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalPrice: z.number(),
  status: requestStatusSchema,
  message: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createRentalRequestSchema = z.object({
  carId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  message: z.string().optional(),
});

export const statusUpdateSchema = z.object({
  status: requestStatusSchema,
  reason: z.string().optional(),
});

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type RentalRequest = z.infer<typeof rentalRequestSchema>;
export type CreateRentalRequest = z.infer<typeof createRentalRequestSchema>;
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;
