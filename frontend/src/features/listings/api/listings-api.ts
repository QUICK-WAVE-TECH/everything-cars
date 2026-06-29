import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import { CarDetail, CarImage, CarImageFiles, CarListItem } from "./types";

type UploadCarImagesInput = {
  carId: string;
  files: CarImageFiles;
};

type PaginationParams = {
  page?: number;
  page_size?: number;
};

type MyCarsParams = PaginationParams & {
  status?: string;
};

export const listingKeys = {
  all: ["cars"] as const,
  owner: ["cars", "owner"] as const,
  ownerList: (params?: MyCarsParams) => ["cars", "owner", params ?? {}] as const,
  ownerDetail: (carId: string) => ["cars", "owner", "detail", carId] as const,
  public: ["cars", "public"] as const,
  publicList: (params?: PublicCarsParams) => ["cars", "public", params ?? {}] as const,
  publicDetail: (carId: string) => ["cars", "public", "detail", carId] as const,
  filterOptions: ["cars", "filter-options"] as const,
};

function buildQuery(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

// Owner — list my cars
export function useMyCarsList(params?: MyCarsParams) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: listingKeys.ownerList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<CarListItem>>(
        `/listings/my-cars${query ? `?${query}` : ""}`,
      ),
    staleTime: 15 * 1000,
  });
}

// Owner — single car detail
export function useMyCarDetail(carId: string) {
  return useQuery({
    queryKey: listingKeys.ownerDetail(carId),
    queryFn: () => apiClient.get<CarDetail>(`/listings/my-cars/${carId}`),
    enabled: !!carId,
    staleTime: 15 * 1000,
  });
}

// Owner — create car
export function useCreateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<CarDetail>("/listings/my-cars", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
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
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
      queryClient.invalidateQueries({ queryKey: listingKeys.ownerDetail(carId) });
      queryClient.invalidateQueries({ queryKey: listingKeys.publicDetail(carId) });
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
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

// Owner — upload images
export function useUploadCarImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, files }: UploadCarImagesInput) => {
      const formData = new FormData();
      Object.entries(files).forEach(([imageType, file]) => {
        if (file) formData.append(imageType, file);
      });
      return apiClient.post<CarImage[]>(
        `/listings/my-cars/${carId}/images`,
        formData,
      );
    },
    onSuccess: (_data, variables) => {
      const { carId } = variables;
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
      queryClient.invalidateQueries({ queryKey: listingKeys.ownerDetail(carId) });
      queryClient.invalidateQueries({ queryKey: listingKeys.public });
      queryClient.invalidateQueries({ queryKey: listingKeys.publicDetail(carId) });
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
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
      queryClient.invalidateQueries({
        queryKey: listingKeys.ownerDetail(variables.carId),
      });
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
} & PaginationParams;

export function usePublicCars(params?: PublicCarsParams) {
  const queryString = buildQuery(params);
  const url = queryString ? `/listings/cars?${queryString}` : "/listings/cars";

  return useQuery({
    queryKey: listingKeys.publicList(params),
    queryFn: () => apiClient.get<PaginatedResponse<CarListItem>>(url),
    staleTime: 45 * 1000,
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
    queryKey: listingKeys.filterOptions,
    queryFn: () => apiClient.get<FilterOptions>("/listings/cars/filter-options"),
    staleTime: 10 * 60 * 1000,
  });
}

// Public — single car detail
export function usePublicCarDetail(carId: string) {
  return useQuery({
    queryKey: listingKeys.publicDetail(carId),
    queryFn: () => apiClient.get<CarDetail>(`/listings/cars/${carId}`),
    enabled: !!carId,
    staleTime: 15 * 1000,
  });
}
