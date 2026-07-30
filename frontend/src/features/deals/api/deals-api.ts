import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type { Deal } from "./types";

export const dealKeys = {
  all: ["deals"] as const,
  list: () => [...dealKeys.all, "list"] as const,
  detail: (id: string) => [...dealKeys.all, id] as const,
};

export function useMyDeals() {
  return useQuery({
    queryKey: dealKeys.list(),
    queryFn: () => apiClient.get<PaginatedResponse<Deal>>("/deals/"),
  });
}

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: dealKeys.detail(dealId),
    queryFn: () => apiClient.get<Deal>(`/deals/${dealId}`),
    enabled: !!dealId,
  });
}

export function useCompleteDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Deal>(`/deals/${dealId}/complete`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) }),
  });
}

export function useCancelDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Deal>(`/deals/${dealId}/cancel`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) }),
  });
}

export function useDisputeDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiClient.post<Deal>(`/deals/${dealId}/dispute`, { reason }),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) }),
  });
}
