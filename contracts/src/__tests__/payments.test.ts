import { describe, it, expect } from "vitest";
import { transactionSchema, paymentIntentSchema } from "../payments";

describe("payments contracts", () => {
  it("validates a transaction object", () => {
    const result = transactionSchema.safeParse({
      id: "txn-1", requestId: "req-1", payerId: "cust-1", payeeId: "owner-1",
      amount: 375, currency: "USD", status: "completed", provider: "stripe",
      providerTransactionId: "pi_abc123", createdAt: "2026-06-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a payment intent", () => {
    expect(paymentIntentSchema.safeParse({
      requestId: "req-1", amount: 375, currency: "USD",
    }).success).toBe(true);
  });

  it("defaults currency to USD", () => {
    const result = paymentIntentSchema.safeParse({ requestId: "req-1", amount: 100 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("USD");
  });
});
