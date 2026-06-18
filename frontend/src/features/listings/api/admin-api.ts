import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type { CarListItem, CarDetail } from "./types";
import type { RequestListItem } from "@/features/requests/api/types";

export function useAdminCars(params?: { status?: string; search?: string; page?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page && params.page > 1) searchParams.set("page", String(params.page));
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["admin-cars", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CarListItem>>(
        `/listings/admin/cars${query ? `?${query}` : ""}`,
      ),
  });
}

// Admin — single car detail (any status)
export function useAdminCarDetail(carId: string | null) {
  return useQuery({
    queryKey: ["admin-cars", carId],
    queryFn: () => apiClient.get<CarDetail>(`/listings/admin/cars/${carId}`),
    enabled: !!carId,
  });
}

export function useAdminRequests(params?: { status?: string; search?: string; page?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page && params.page > 1) searchParams.set("page", String(params.page));
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["admin-requests", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<RequestListItem>>(
        `/listings/admin/requests${query ? `?${query}` : ""}`,
      ),
  });
}

export function useAdminRequestDetail(requestId: string | null) {
  return useQuery({
    queryKey: ["admin-requests", requestId],
    queryFn: () =>
      apiClient.get<import("@/features/requests/api/types").RequestDetail>(
        `/listings/admin/requests/${requestId}`,
      ),
    enabled: !!requestId,
  });
}

export function useAdminCarStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, status, note }: { carId: string; status: string; note?: string }) =>
      apiClient.post<CarDetail>(`/listings/admin/cars/${carId}/status`, { status, ...(note ? { note } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cars"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["my-cars"] });
    },
  });
}
