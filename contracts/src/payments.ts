import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  payerId: z.string(),
  payeeId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  provider: z.string(),
  providerTransactionId: z.string().optional(),
  createdAt: z.string(),
});

export const paymentIntentSchema = z.object({
  requestId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
});

export const paymentResultSchema = z.object({
  transactionId: z.string(),
  status: z.enum(["completed", "failed"]),
  providerTransactionId: z.string().optional(),
  error: z.string().optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
export type PaymentResult = z.infer<typeof paymentResultSchema>;
