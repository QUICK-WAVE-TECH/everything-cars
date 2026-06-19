import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type {
  RequestListItem,
  RequestDetail,
  CreateRequestData,
  RequestAction,
} from "./types";

type RequestQueryOptions = {
  enabled?: boolean;
};

// ── Customer hooks ──

export function useCustomerRequests(
  params?: { status?: string },
  options?: RequestQueryOptions,
) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["customer-requests", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<RequestListItem>>(
        `/listings/requests${query ? `?${query}` : ""}`,
      ),
    enabled: options?.enabled ?? true,
  });
}

export function useCustomerRequestDetail(requestId: string) {
  return useQuery({
    queryKey: ["customer-requests", requestId],
    queryFn: () =>
      apiClient.get<RequestDetail>(`/listings/requests/${requestId}`),
    enabled: !!requestId,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRequestData) =>
      apiClient.post<RequestDetail>("/listings/requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.post<{ detail: string }>(
        `/listings/requests/${requestId}/cancel`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["owner-requests"] });
    },
  });
}

// ── Owner hooks ──

export function useOwnerRequests(params?: { status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["owner-requests", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<RequestListItem>>(
        `/listings/owner-requests${query ? `?${query}` : ""}`,
      ),
  });
}

export function useOwnerRequestDetail(requestId: string) {
  return useQuery({
    queryKey: ["owner-requests", requestId],
    queryFn: () =>
      apiClient.get<RequestDetail>(
        `/listings/owner-requests/${requestId}`,
      ),
    enabled: !!requestId,
  });
}

export function useRequestAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      note,
    }: {
      requestId: string;
      action: RequestAction;
      note?: string;
    }) =>
      apiClient.post<RequestDetail>(
        `/listings/owner-requests/${requestId}/action`,
        { action, note: note ?? "" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-requests"] });
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
    },
  });
}
