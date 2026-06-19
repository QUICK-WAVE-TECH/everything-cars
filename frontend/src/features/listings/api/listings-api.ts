import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import { CarDetail, CarImage, CarListItem } from "./types";

type UploadCarImagesInput = {
  carId: string;
  files: File[];
};

// Owner — list my cars
export function useMyCarsList() {
  return useQuery({
    queryKey: ["my-cars"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CarListItem>>("/listings/my-cars"),
  });
}

// Owner — single car detail
export function useMyCarDetail(carId: string) {
  return useQuery({
    queryKey: ["my-cars", carId],
    queryFn: () => apiClient.get<CarDetail>(`/listings/my-cars/${carId}`),
    enabled: !!carId,
  });
}

// Owner — create car
export function useCreateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<CarDetail>("/listings/my-cars", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cars"] });
    },
  });
}

// Owner — update car
export function useUpdateCar(carId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch<CarDetail>(`/listings/my-cars/${carId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cars"] });
      queryClient.invalidateQueries({ queryKey: ["my-cars", carId] });
      queryClient.invalidateQueries({ queryKey: ["cars", carId] });
    },
  });
}

// Owner — delete (archive) car
export function useDeleteCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (carId: string) =>
      apiClient.delete(`/listings/my-cars/${carId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cars"] });
    },
  });
}

// Owner — upload images
export function useUploadCarImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, files }: UploadCarImagesInput) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      return apiClient.post<CarImage[]>(
        `/listings/my-cars/${carId}/images`,
        formData,
      );
    },
    onSuccess: (_data, variables) => {
      const { carId } = variables;
      queryClient.invalidateQueries({ queryKey: ["my-cars"] });
      queryClient.invalidateQueries({ queryKey: ["my-cars", carId] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["cars", carId] });
    },
  });
}

// Owner — change car status
export function useCarStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, status }: { carId: string; status: string }) =>
      apiClient.post<CarDetail>(`/listings/my-cars/${carId}/status`, {
        status,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-cars"] });
      queryClient.invalidateQueries({ queryKey: ["my-cars", variables.carId] });
    },
  });
}

// Public — browse published cars (with optional filter params)
export type PublicCarsParams = {
  listing_type?: string;
  state?: string;
  city?: string;
  brand?: string;
  body_type?: string;
  search?: string;
};

export function usePublicCars(params?: PublicCarsParams) {
  const query = new URLSearchParams();
  if (params?.listing_type) query.set("listing_type", params.listing_type);
  if (params?.state) query.set("state", params.state);
  if (params?.city) query.set("city", params.city);
  if (params?.brand) query.set("brand", params.brand);
  if (params?.body_type) query.set("body_type", params.body_type);
  if (params?.search) query.set("search", params.search);
  const queryString = query.toString();
  const url = queryString ? `/listings/cars?${queryString}` : "/listings/cars";

  return useQuery({
    queryKey: ["cars", params ?? {}],
    queryFn: () => apiClient.get<PaginatedResponse<CarListItem>>(url),
  });
}

// Public — filter dropdown options
export type FilterOptions = {
  states: string[];
  cities: string[];
  body_types: string[];
  brands: string[];
};

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: () => apiClient.get<FilterOptions>("/listings/cars/filter-options"),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Public — single car detail
export function usePublicCarDetail(carId: string) {
  return useQuery({
    queryKey: ["cars", carId],
    queryFn: () => apiClient.get<CarDetail>(`/listings/cars/${carId}`),
    enabled: !!carId,
  });
}
