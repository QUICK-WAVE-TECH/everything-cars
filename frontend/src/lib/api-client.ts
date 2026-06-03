import { config } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  headers?: Record<string, string>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = `${config.apiUrl}${path}`;

  const headers: Record<string, string> = {
    ...options?.headers,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  // Add access token if available (stored in memory by auth store)
  const token =
    typeof window !== "undefined"
      ? window.__everythingcars_token
      : undefined;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // sends httpOnly refresh cookie
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as { detail?: string }).detail ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

// Type declaration for the in-memory token
declare global {
  interface Window {
    __everythingcars_token?: string;
  }
}
