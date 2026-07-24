import { describe, expect, it } from "vitest";

import {
  formatDecimalInput,
  normalizeDecimalInput,
} from "@/features/listings/lib/decimal-input";

describe("decimal input helpers", () => {
  it("adds thousands separators without changing the raw value", () => {
    const rawValue = normalizeDecimalInput("200000");

    expect(rawValue).toBe("200000");
    expect(formatDecimalInput(rawValue)).toBe("200,000");
  });

  it("preserves decimal digits and trailing zeros", () => {
    expect(formatDecimalInput("24000000.00")).toBe("24,000,000.00");
    expect(formatDecimalInput("200000.5")).toBe("200,000.5");
  });

  it("normalizes formatted or currency-prefixed pasted values", () => {
    expect(normalizeDecimalInput("₦1,234,567.89")).toBe("1234567.89");
  });

  it("keeps only the first decimal point", () => {
    expect(normalizeDecimalInput("12.34.56")).toBe("12.3456");
  });
});
