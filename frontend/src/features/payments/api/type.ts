import type { RequestDetail } from "@/features/requests/api/types";

export type TransactionListItem = {
  id: string;
  car_detail: string;
  /** Fleet business behind the car, or null for an individual owner. */
  company_name: string | null;
  payer_name: string;
  receiver_name: string;
  request_type: string;
  amount: string;
  currency: string;
  transaction_type: "rental" | "purchase" | "inspection" | "refund";
  payment_method: string;
  status: "pending" | "completed" | "failed" | "refunded";
  reference: string;
  created_at: string;
};

export type TransactionDetail = TransactionListItem & {
  request: RequestDetail;
};
