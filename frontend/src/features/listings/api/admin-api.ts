import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type { CarListItem, CarDetail } from "./types";
import type { RequestListItem } from "@/features/requests/api/types";
import { listingKeys } from "./listings-api";

type AdminListParams = {
  status?: string;
  search?: string;
  request_type?: "rent" | "buy";
  page?: number;
  page_size?: number;
  ordering?: "created_at" | "-created_at" | "price_offered" | "-price_offered";
};

export const adminListingKeys = {
  cars: ["cars", "admin"] as const,
  carCounts: ["cars", "admin", "status-counts"] as const,
  carsList: (params?: AdminListParams) => ["cars", "admin", params ?? {}] as const,
  carDetail: (carId: string | null) => ["cars", "admin", "detail", carId] as const,
  requests: ["requests", "admin"] as const,
  requestCounts: ["requests", "admin", "status-counts"] as const,
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

// Admin — car counts per status (drives the approvals KPIs and tab badges)
export function useAdminCarCounts() {
  return useQuery({
    queryKey: adminListingKeys.carCounts,
    queryFn: () =>
      apiClient.get<Record<string, number>>("/listings/admin/cars/status-counts"),
    staleTime: 15 * 1000,
  });
}

// Admin — full status timeline (includes owner clearance responses)
export function useAdminCarHistory(carId: string | null) {
  return useQuery({
    queryKey: [...adminListingKeys.cars, "history", carId] as const,
    queryFn: () =>
      apiClient.get<
        import("@/features/inspections/api/types").CarStatusHistoryEntry[]
      >(`/listings/admin/cars/${carId}/history`),
    enabled: !!carId,
    staleTime: 10 * 1000,
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

export function useAdminRequestCounts() {
  return useQuery({
    queryKey: adminListingKeys.requestCounts,
    queryFn: () =>
      apiClient.get<Record<string, number>>(
        "/listings/admin/requests/status-counts",
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

// Admin — approve a draft/needs_changes listing for inspection booking
export function useApproveListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (carId: string) =>
      apiClient.post<CarDetail>(`/listings/admin/cars/${carId}/approve-listing`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminListingKeys.cars });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

// Admin — request changes on a draft listing (note required)
export function useRequestChanges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, note }: { carId: string; note: string }) =>
      apiClient.post<CarDetail>(`/listings/admin/cars/${carId}/status`, {
        status: "needs_changes",
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminListingKeys.cars });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}
