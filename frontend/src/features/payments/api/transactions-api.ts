import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import { requestKeys } from "@/features/requests/api/requests-api";
import { adminListingKeys } from "@/features/listings/api/admin-api";
import type { RequestDetail } from "@/features/requests/api/types";
import type {
  TransactionListItem,
  TransactionDetail,
} from "@/features/payments/api/type";

type TransactionParams = {
  status?: string;
  /** Filter to one car (its tracking ID links here). */
  car?: string;
  page?: number;
  page_size?: number;
};

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (params?: TransactionParams) => ["transactions", params ?? {}] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
};

function buildQuery(params?: TransactionParams) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export function useTransactions(params?: TransactionParams) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<TransactionListItem>>(
        `/listings/transactions${query ? `?${query}` : ""}`,
      ),
    staleTime: 20 * 1000,
  });
}

export type TransactionSummary = {
  gross_volume: number;
  completed: number;
  pending: number;
  failed: number;
  refunded: number;
};

/** Staff KPI totals over ALL transactions (not just the paged window). */
export function useTransactionSummary() {
  return useQuery({
    queryKey: ["transactions", "summary"],
    queryFn: () =>
      apiClient.get<TransactionSummary>("/listings/admin/transactions/summary"),
    staleTime: 20 * 1000,
  });
}

export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () =>
      apiClient.get<TransactionDetail>(`/listings/transactions/${id}`),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useSubmitPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      paymentMethod,
      receipt,
    }: {
      requestId: string;
      paymentMethod: "transfer" | "card";
      receipt?: File;
    }) => {
      const formData = new FormData();
      formData.append("payment_method", paymentMethod);
      if (receipt) {
        formData.append("receipt", receipt);
      }
      return apiClient.post<RequestDetail>(
        `/listings/requests/${requestId}/submit-payment`,
        formData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.customer });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useStaffConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.post<RequestDetail>(
        `/listings/admin/requests/${requestId}/confirm-payment`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminListingKeys.requests });
      queryClient.invalidateQueries({ queryKey: requestKeys.customer });
      queryClient.invalidateQueries({ queryKey: requestKeys.owner });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export type { TransactionListItem, TransactionDetail } from "./type";
