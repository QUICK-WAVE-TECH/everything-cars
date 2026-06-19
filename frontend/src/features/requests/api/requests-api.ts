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

type RequestListParams = {
  status?: string;
  page?: number;
  page_size?: number;
};

export const requestKeys = {
  all: ["requests"] as const,
  customer: ["requests", "customer"] as const,
  customerList: (params?: RequestListParams) =>
    ["requests", "customer", params ?? {}] as const,
  customerDetail: (requestId: string) =>
    ["requests", "customer", "detail", requestId] as const,
  owner: ["requests", "owner"] as const,
  ownerList: (params?: RequestListParams) =>
    ["requests", "owner", params ?? {}] as const,
  ownerDetail: (requestId: string) =>
    ["requests", "owner", "detail", requestId] as const,
};

function buildQuery(params?: RequestListParams) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

// ── Customer hooks ──

export function useCustomerRequests(
  params?: RequestListParams,
  options?: RequestQueryOptions,
) {
  const query = buildQuery(params);

  return useQuery({
    queryKey: requestKeys.customerList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<RequestListItem>>(
        `/listings/requests${query ? `?${query}` : ""}`,
      ),
    enabled: options?.enabled ?? true,
    staleTime: 15 * 1000,
  });
}

export function useCustomerRequestDetail(requestId: string) {
  return useQuery({
    queryKey: requestKeys.customerDetail(requestId),
    queryFn: () =>
      apiClient.get<RequestDetail>(`/listings/requests/${requestId}`),
    enabled: !!requestId,
    staleTime: 10 * 1000,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRequestData) =>
      apiClient.post<RequestDetail>("/listings/requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.customer });
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
      queryClient.invalidateQueries({ queryKey: requestKeys.customer });
      queryClient.invalidateQueries({ queryKey: requestKeys.owner });
    },
  });
}

// ── Owner hooks ──

export function useOwnerRequests(params?: RequestListParams) {
  const query = buildQuery(params);

  return useQuery({
    queryKey: requestKeys.ownerList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<RequestListItem>>(
        `/listings/owner-requests${query ? `?${query}` : ""}`,
      ),
    staleTime: 15 * 1000,
  });
}

export function useOwnerRequestDetail(requestId: string) {
  return useQuery({
    queryKey: requestKeys.ownerDetail(requestId),
    queryFn: () =>
      apiClient.get<RequestDetail>(
        `/listings/owner-requests/${requestId}`,
      ),
    enabled: !!requestId,
    staleTime: 10 * 1000,
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
      queryClient.invalidateQueries({ queryKey: requestKeys.owner });
      queryClient.invalidateQueries({ queryKey: requestKeys.customer });
    },
  });
}
