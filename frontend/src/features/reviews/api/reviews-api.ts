import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ReviewsResponse, CreateReviewInput, UpdateReviewInput } from "./types";

export function useCarReviews(carId: string) {
  return useQuery({
    queryKey: ["reviews", carId],
    queryFn: () => apiClient.get<ReviewsResponse>(`/listings/cars/${carId}/reviews`),
    enabled: !!carId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, request, rating, comment }: CreateReviewInput) =>
      apiClient.post(`/listings/cars/${carId}/reviews`, { request, rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, comment }: UpdateReviewInput) =>
      apiClient.patch(`/listings/reviews/${id}`, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/listings/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}
