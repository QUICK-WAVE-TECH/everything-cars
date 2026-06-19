import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type { RequestDetail } from "@/features/requests/api/types";
import type {
  TransactionListItem,
  TransactionDetail,
} from "@/features/payments/api/type";

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<TransactionListItem>>(
        `/listings/transactions`,
      ),
  });
}

export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () =>
      apiClient.get<TransactionDetail>(`/listings/transactions/${id}`),
    enabled: !!id,
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
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["owner-requests"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export type { TransactionListItem, TransactionDetail } from "./type";
