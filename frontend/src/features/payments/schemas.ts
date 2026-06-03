import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  payerId: z.string(),
  payeeId: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  createdAt: z.string(),
});

export const paymentIntentSchema = z.object({
  requestId: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
