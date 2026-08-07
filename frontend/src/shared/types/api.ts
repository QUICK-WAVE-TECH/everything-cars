/** Standard paginated response from the API */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Standard API error response */
export type ApiErrorResponse = {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
};

/** User roles in the system */
export type UserRole = "customer" | "owner" | "team_member";

/** Common request status across the rental flow */
export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "active"
  | "completed"
  | "cancelled";
