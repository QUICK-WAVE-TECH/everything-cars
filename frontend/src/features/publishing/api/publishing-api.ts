import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";

import type { PendingPublishingRow, PublishingDetail } from "./types";

const BASE = "/inspections/staff/pending-publishing";

export const publishingKeys = {
  all: ["publishing"] as const,
  list: (search: string, page: number) =>
    [...publishingKeys.all, "list", search, page] as const,
  detail: (id: string) => [...publishingKeys.all, id] as const,
};

/** Paginated FIFO queue of cars awaiting publishing. */
export function usePendingPublishing(search: string, page: number) {
  return useQuery({
    queryKey: publishingKeys.list(search, page),
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (page > 1) params.set("page", String(page));
      const qs = params.toString();
      return apiClient.get<PaginatedResponse<PendingPublishingRow>>(
        `${BASE}/${qs ? `?${qs}` : ""}`,
      );
    },
  });
}

export function usePublishingDetail(carId: string | null) {
  return useQuery({
    queryKey: carId ? publishingKeys.detail(carId) : ["publishing", "none"],
    queryFn: () => apiClient.get<PublishingDetail>(`${BASE}/${carId}/`),
    enabled: !!carId,
  });
}

export function usePublishCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (carId: string) =>
      apiClient.post<{ status: string }>(`${BASE}/${carId}/publish/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: publishingKeys.all }),
  });
}

export function useSendBackCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, note }: { carId: string; note: string }) =>
      apiClient.post<{ status: string }>(`${BASE}/${carId}/send-back/`, { note }),
    meta: { skipGlobalOverlay: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: publishingKeys.all }),
  });
}
