import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api-client";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    text: async () => JSON.stringify(body),
  };
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes GET requests with correct base URL", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: "test" }));

    await apiClient.get("/listings");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/listings"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("makes POST requests with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ id: 1 }));

    await apiClient.post("/auth/sign-in", { email: "test@example.com" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/sign-in"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      }),
    );
  });

  it("includes Content-Type header for JSON requests", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiClient.post("/test", { key: "value" });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("throws ApiError on non-ok responses", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ detail: "Unauthorized" }, { ok: false, status: 401 }),
    );
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ detail: "Refresh failed" }, { ok: false, status: 401 }),
    );

    await expect(apiClient.get("/protected")).rejects.toThrow("Unauthorized");
  });
});
