import { describe, it, expect } from "vitest";
import { config } from "@/lib/config";

describe("config", () => {
  it("exposes apiUrl with a default value", () => {
    expect(config.apiUrl).toBeDefined();
    expect(typeof config.apiUrl).toBe("string");
  });

  it("exposes appName with a default value", () => {
    expect(config.appName).toBe("EverythingCars");
  });
});
