import { config } from "./config";

export class ApiError extends Error {
  public retryAfter?: number;

  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken: string };
    return data.accessToken;
  } catch {
    return null;
  }
}

type RequestOptions = {
  headers?: Record<string, string>;
};

function hasBody(body: unknown) {
  return body !== undefined && body !== null;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

function formatApiErrorMessage(errorData: unknown, fallback: string) {
  if (!errorData || typeof errorData !== "object") {
    return fallback;
  }

  const detail = (errorData as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.join(" ");
  }

  const fieldMessages = Object.entries(errorData as Record<string, unknown>)
    .flatMap(([field, value]) => {
      const label = field.replaceAll("_", " ");
      if (Array.isArray(value)) {
        return value.map((message) => `${label}: ${String(message)}`);
      }
      if (typeof value === "string") {
        return [`${label}: ${value}`];
      }
      return [];
    });

  return fieldMessages[0] ?? fallback;
}

async function throwApiError(response: Response): Promise<never> {
  const errorData = await parseResponse<unknown>(response).catch(() => ({}));
  const message = formatApiErrorMessage(
    errorData,
    `Request failed with status ${response.status}`,
  );

  const error = new ApiError(response.status, message, errorData);

  // Parse Retry-After header for 429 responses
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      error.retryAfter = Math.ceil(Number(retryAfter));
    }
  }

  throw error;
}

function isAuthErrorStatus(status: number) {
  return status === 401 || status === 403;
}

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

  const requestHasBody = hasBody(body);
  const requestIsFormData = isFormData(body);

  if (requestHasBody && !requestIsFormData) {
    headers["Content-Type"] = "application/json";
  }

  const requestBody: BodyInit | undefined = requestHasBody
    ? requestIsFormData
      ? body
      : JSON.stringify(body)
    : undefined;
  // Add access token if available (stored in memory by auth store)
  const token =
    typeof window !== "undefined" ? window.__everythingcars_token : undefined;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
    credentials: "include", // sends httpOnly refresh cookie
  });

  if (!response.ok) {
    const isRefreshRequest = path === "/auth/refresh";

    if (isAuthErrorStatus(response.status) && !isRefreshRequest) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken && typeof window !== "undefined") {
        window.__everythingcars_token = newToken;
        headers["Authorization"] = `Bearer ${newToken}`;

        const retryResponse = await fetch(url, {
          method,
          headers,
          body: requestBody,
          credentials: "include",
        });

        if (retryResponse.ok) {
          return parseResponse<T>(retryResponse);
        }

        return throwApiError(retryResponse);
      }

      if (typeof window !== "undefined") {
        delete window.__everythingcars_token;
      }
    }

    return throwApiError(response);
  }
  return parseResponse<T>(response);
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

  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("DELETE", path, body, options),
};

// Type declaration for the in-memory token
declare global {
  interface Window {
    __everythingcars_token?: string;
  }
}
