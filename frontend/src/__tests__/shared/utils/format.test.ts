import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatRelativeDate } from "@/shared/utils/format";

describe("formatCurrency", () => {
  it("formats a number as USD currency", () => {
    expect(formatCurrency(1500)).toBe("$1,500.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats decimal amounts", () => {
    expect(formatCurrency(99.9)).toBe("$99.90");
  });
});

describe("formatDate", () => {
  it("formats a date string as readable date", () => {
    const result = formatDate("2026-06-03T10:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2026");
  });
});

describe("formatRelativeDate", () => {
  it("returns 'just now' for recent dates", () => {
    const now = new Date().toISOString();
    expect(formatRelativeDate(now)).toBe("just now");
  });
});
