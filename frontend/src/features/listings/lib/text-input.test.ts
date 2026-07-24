import { describe, expect, it } from "vitest";

import { capitalizeFirstLetter } from "@/features/listings/lib/text-input";

describe("capitalizeFirstLetter", () => {
  it("capitalizes a normal text value", () => {
    expect(capitalizeFirstLetter("toyota")).toBe("Toyota");
  });

  it("preserves the remaining casing", () => {
    expect(capitalizeFirstLetter("bMW")).toBe("BMW");
    expect(capitalizeFirstLetter("e-tron")).toBe("E-tron");
  });

  it("capitalizes the first letter after a number or space", () => {
    expect(capitalizeFirstLetter("3 series")).toBe("3 Series");
    expect(capitalizeFirstLetter("  blue")).toBe("  Blue");
  });

  it("leaves values without letters unchanged", () => {
    expect(capitalizeFirstLetter("2026")).toBe("2026");
  });
});
