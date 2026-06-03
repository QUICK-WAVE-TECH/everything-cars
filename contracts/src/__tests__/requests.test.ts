import { describe, it, expect } from "vitest";
import { rentalRequestSchema, createRentalRequestSchema, statusUpdateSchema } from "../requests";

describe("requests contracts", () => {
  it("validates a rental request object", () => {
    const result = rentalRequestSchema.safeParse({
      id: "req-1", customerId: "cust-1", customerName: "Jane Doe", carId: "car-1",
      carSummary: "2024 Toyota Camry", ownerId: "owner-1", startDate: "2026-07-01",
      endDate: "2026-07-05", totalPrice: 375, status: "pending",
      message: "I need it for a business trip",
      createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a create request", () => {
    expect(createRentalRequestSchema.safeParse({
      carId: "car-1", startDate: "2026-07-01", endDate: "2026-07-05",
    }).success).toBe(true);
  });

  it("validates status updates", () => {
    expect(statusUpdateSchema.safeParse({ status: "approved" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(statusUpdateSchema.safeParse({ status: "invalid" }).success).toBe(false);
  });
});
