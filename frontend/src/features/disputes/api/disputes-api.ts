import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type { DisputeDeal, DisputeListParams } from "./types";

export const disputeKeys = {
  all: ["disputes"] as const,
  list: (params: DisputeListParams) =>
    [...disputeKeys.all, "list", params] as const,
  openCount: () => [...disputeKeys.all, "open-count"] as const,
};

function buildQuery({ status, search, page }: DisputeListParams) {
  const qs = new URLSearchParams({ status, page: String(page) });
  if (search) qs.set("search", search);
  return qs.toString();
}

export function useDisputes(params: DisputeListParams) {
  return useQuery({
    queryKey: disputeKeys.list(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<DisputeDeal>>(
        `/deals/staff/disputes/?${buildQuery(params)}`,
      ),
    // Keep the current page on screen while the next one loads (no skeleton flash).
    placeholderData: keepPreviousData,
  });
}

/** Just the open-dispute total, for the header chip and the nav badge. */
export function useOpenDisputeCount() {
  return useQuery({
    queryKey: disputeKeys.openCount(),
    queryFn: () =>
      apiClient.get<PaginatedResponse<DisputeDeal>>(
        "/deals/staff/disputes/?status=open&page=1",
      ),
    select: (data) => data.count,
  });
}

export function useUpholdDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<DisputeDeal>(`/deals/staff/disputes/${id}/uphold/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: disputeKeys.all }),
  });
}

export function useDismissDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiClient.post<DisputeDeal>(`/deals/staff/disputes/${id}/dismiss/`, {
        note,
      }),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: disputeKeys.all }),
  });
}
