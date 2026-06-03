import { describe, it, expect } from "vitest";
import { carSchema, createCarRequestSchema, searchFiltersSchema } from "../listings";

describe("listings contracts", () => {
  it("validates a complete car object", () => {
    const result = carSchema.safeParse({
      id: "car-1", ownerId: "owner-1", ownerName: "John Doe", ownerType: "individual",
      make: "Toyota", model: "Camry", year: 2024, color: "White", pricePerDay: 75,
      location: "New York, NY", description: "Well-maintained sedan",
      images: ["https://example.com/car1.jpg"], features: ["AC", "Bluetooth"],
      isAvailable: true, createdAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a create car request", () => {
    const result = createCarRequestSchema.safeParse({
      make: "Honda", model: "Civic", year: 2025, color: "Black", pricePerDay: 60,
      location: "Los Angeles, CA", description: "Compact and fuel efficient", features: ["AC"],
    });
    expect(result.success).toBe(true);
  });

  it("validates search filters with optional fields", () => {
    expect(searchFiltersSchema.safeParse({ minPrice: 50, maxPrice: 200 }).success).toBe(true);
  });

  it("validates empty search filters", () => {
    expect(searchFiltersSchema.safeParse({}).success).toBe(true);
  });
});
