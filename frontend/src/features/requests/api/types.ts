import type { CarDetail } from "@/features/listings/api/types";

export type RequestCustomer = {
  id: string;
  first_name: string;
  last_name: string;
};

export type RequestCarSummary = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  primary_image: string | null;
  owner: {
    id: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
  };
};

export type RequestStatusEvent = {
  id: string;
  from_status: string;
  to_status: string;
  actor_name: string;
  note: string;
  created_at: string;
};

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "paid"
  | "active"
  | "completed";

export type RequestListItem = {
  id: string;
  car: RequestCarSummary;
  customer: RequestCustomer;
  request_type: "rent" | "buy";
  price_offered: string;
  currency: string;
  duration_days: number | null;
  start_date: string | null;
  status: RequestStatus;
  created_at: string;
};

export type RequestDetail = {
  id: string;
  car: CarDetail;
  customer: RequestCustomer;
  request_type: "rent" | "buy";
  price_offered: string;
  currency: string;
  duration_days: number | null;
  start_date: string | null;
  message: string;
  status: RequestStatus;
  owner_note: string;
  created_at: string;
  updated_at: string;
  status_events: RequestStatusEvent[];
};

export type CreateRequestData = {
  car: string;
  request_type: "rent" | "buy";
  price_offered: string;
  duration_days?: number;
  start_date?: string;
  message?: string;
};

export type RequestAction =
  | "approve"
  | "reject"
  | "confirm_payment"
  | "mark_active"
  | "complete";
