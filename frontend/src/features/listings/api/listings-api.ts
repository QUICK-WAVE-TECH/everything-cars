import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { CarDetail, CarImage, CarListItem } from "./types";
// Owner — list my cars
export function useMyCarsList() {
  return useQuery({
    queryKey: ["my-cars"],
    queryFn: () => apiClient.get<CarListItem[]>("/listings/my-cars"),
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
export function useUploadCarImages(carId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      return apiClient.post<CarImage[]>(
        `/listings/my-cars/${carId}/images`,
        formData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cars", carId] });
      queryClient.invalidateQueries({ queryKey: ["cars", carId] });
    },
  });
}

// Public — browse published cars
export function usePublicCars() {
  return useQuery({
    queryKey: ["cars"],
    queryFn: () => apiClient.get<CarListItem[]>("/listings/cars"),
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
