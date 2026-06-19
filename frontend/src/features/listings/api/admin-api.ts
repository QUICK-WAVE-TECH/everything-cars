import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type { CarListItem, CarDetail } from "./types";
import type { RequestListItem } from "@/features/requests/api/types";
import { listingKeys } from "./listings-api";

type AdminListParams = {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
};

export const adminListingKeys = {
  cars: ["cars", "admin"] as const,
  carsList: (params?: AdminListParams) => ["cars", "admin", params ?? {}] as const,
  carDetail: (carId: string | null) => ["cars", "admin", "detail", carId] as const,
  requests: ["requests", "admin"] as const,
  requestsList: (params?: AdminListParams) =>
    ["requests", "admin", params ?? {}] as const,
  requestDetail: (requestId: string | null) =>
    ["requests", "admin", "detail", requestId] as const,
};

function buildQuery(params?: AdminListParams) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export function useAdminCars(params?: AdminListParams) {
  const query = buildQuery(params);

  return useQuery({
    queryKey: adminListingKeys.carsList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<CarListItem>>(
        `/listings/admin/cars${query ? `?${query}` : ""}`,
      ),
    staleTime: 15 * 1000,
  });
}

// Admin — single car detail (any status)
export function useAdminCarDetail(carId: string | null) {
  return useQuery({
    queryKey: adminListingKeys.carDetail(carId),
    queryFn: () => apiClient.get<CarDetail>(`/listings/admin/cars/${carId}`),
    enabled: !!carId,
    staleTime: 10 * 1000,
  });
}

export function useAdminRequests(params?: AdminListParams) {
  const query = buildQuery(params);

  return useQuery({
    queryKey: adminListingKeys.requestsList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<RequestListItem>>(
        `/listings/admin/requests${query ? `?${query}` : ""}`,
      ),
    staleTime: 15 * 1000,
  });
}

export function useAdminRequestDetail(requestId: string | null) {
  return useQuery({
    queryKey: adminListingKeys.requestDetail(requestId),
    queryFn: () =>
      apiClient.get<import("@/features/requests/api/types").RequestDetail>(
        `/listings/admin/requests/${requestId}`,
      ),
    enabled: !!requestId,
    staleTime: 10 * 1000,
  });
}

export function useAdminCarStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, status, note }: { carId: string; status: string; note?: string }) =>
      apiClient.post<CarDetail>(`/listings/admin/cars/${carId}/status`, { status, ...(note ? { note } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminListingKeys.cars });
      queryClient.invalidateQueries({ queryKey: listingKeys.public });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}
