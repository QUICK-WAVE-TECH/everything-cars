import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type {
  Offer,
  OfferRespondPayload,
  OwnerCarRange,
  OwnerOffer,
  OwnerOfferFilters,
  PlaceOfferPayload,
} from "./types";

export const offerKeys = {
  all: ["offers"] as const,
  mine: () => [...offerKeys.all, "mine"] as const,
  owner: (filters?: OwnerOfferFilters) =>
    [...offerKeys.all, "owner", filters ?? {}] as const,
  range: (carId: string) => [...offerKeys.all, "range", carId] as const,
};

/** Customer places an offer on a negotiable buy car. */
export function usePlaceOffer(carId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlaceOfferPayload) =>
      apiClient.post<Offer>(`/offers/cars/${carId}/offers`, payload),
    // Inline progress in the dialog; a full-screen takeover here reads as slow.
    meta: { skipGlobalOverlay: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.mine() });
    },
  });
}

/** A customer's own offers. */
export function useMyOffers() {
  return useQuery({
    queryKey: offerKeys.mine(),
    queryFn: () => apiClient.get<PaginatedResponse<Offer>>("/offers/my-offers"),
  });
}

function ownerOffersPath(filters?: OwnerOfferFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.car) params.set("car", filters.car);
  const qs = params.toString();
  return qs ? `/offers/owner-offers?${qs}` : "/offers/owner-offers";
}

/** Offers on the authenticated owner's cars, optionally filtered. */
export function useOwnerOffers(filters?: OwnerOfferFilters) {
  return useQuery({
    queryKey: offerKeys.owner(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OwnerOffer>>(ownerOffersPath(filters)),
  });
}

/**
 * Respond to an offer. One endpoint for both parties — the server decides which
 * transitions are legal from who you are. Invalidates both offer lists since a
 * response can move an offer for either side.
 */
export function useRespondToOffer(offerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OfferRespondPayload) =>
      apiClient.post<Offer>(`/offers/offers/${offerId}/respond`, payload),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}

/**
 * The owner's private acceptable range for a car — fetched lazily (pass
 * `enabled: open`) when a respond sheet opens, so it's never pulled for cars the
 * owner isn't actively acting on. Owner-only; 404 for anyone else.
 */
export function useCarRange(carId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: offerKeys.range(carId),
    queryFn: () => apiClient.get<OwnerCarRange>(`/offers/cars/${carId}/range`),
    enabled: !!carId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

/** Customer withdraws a still-pending offer. */
export function useWithdrawOffer(offerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<Offer>(`/offers/offers/${offerId}/withdraw`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.mine() });
    },
  });
}
