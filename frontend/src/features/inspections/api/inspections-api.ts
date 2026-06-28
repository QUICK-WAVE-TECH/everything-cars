import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type {
  AvailableSlot,
  InspectionBooking,
  InspectionBookingDetail,
  InspectionSlot,
} from "./types";
import { listingKeys } from "@/features/listings/api/listings-api";
import { adminListingKeys } from "@/features/listings/api/admin-api";

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export const inspectionKeys = {
  slots: ["inspections", "slots"] as const,
  slotsList: (params?: Record<string, string | undefined>) =>
    ["inspections", "slots", params ?? {}] as const,
  availableSlots: (date?: string) =>
    ["inspections", "available-slots", date ?? "all"] as const,
  bookings: ["inspections", "bookings"] as const,
  myBookings: ["inspections", "bookings", "my"] as const,
  adminBookings: ["inspections", "admin-bookings"] as const,
  adminBookingsList: (params?: Record<string, string | undefined>) =>
    ["inspections", "admin-bookings", params ?? {}] as const,
  adminBookingDetail: (id: string | null) =>
    ["inspections", "admin-bookings", "detail", id] as const,
};

// ── Staff Slot Management ──

export function useStaffSlots(params?: { date_from?: string; date_to?: string; is_active?: string }) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.slotsList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<InspectionSlot>>(
        `/inspections/slots/${query ? `?${query}` : ""}`,
      ),
    staleTime: 15_000,
  });
}

export function useCreateSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date_from: string;
      date_to: string;
      days: number[];
      time_slots: { start_time: string; end_time: string }[];
      capacity: number;
      location: string;
    }) => apiClient.post<{ created_count: number; slots: InspectionSlot[] }>("/inspections/slots/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.slots });
    },
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, ...data }: { slotId: string; capacity?: number; location?: string; note?: string; is_active?: boolean }) =>
      apiClient.patch<InspectionSlot>(`/inspections/slots/${slotId}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.slots });
    },
  });
}

export function useDeactivateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => apiClient.delete(`/inspections/slots/${slotId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.slots });
    },
  });
}

// ── Owner Available Slots ──

export function useAvailableSlots(date?: string) {
  const query = date ? `?date=${date}` : "";
  return useQuery({
    queryKey: inspectionKeys.availableSlots(date),
    queryFn: () => apiClient.get<AvailableSlot[]>(`/inspections/available-slots/${query}`),
    staleTime: 30_000,
  });
}

// ── Owner Bookings ──

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { car_id: string; slot_id: string }) =>
      apiClient.post<InspectionBooking>("/inspections/bookings/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.bookings });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: inspectionKeys.myBookings,
    queryFn: () =>
      apiClient.get<PaginatedResponse<InspectionBooking>>("/inspections/bookings/my/"),
    staleTime: 15_000,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/inspections/bookings/${bookingId}/cancel/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.bookings });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, slot_id }: { bookingId: string; slot_id: string }) =>
      apiClient.post<InspectionBooking>(`/inspections/bookings/${bookingId}/reschedule/`, { slot_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.bookings });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.slots });
    },
  });
}

// ── Staff Booking Management ──

export function useStaffBookings(params?: { status?: string; date?: string }) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.adminBookingsList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<InspectionBooking>>(
        `/inspections/admin/bookings/${query ? `?${query}` : ""}`,
      ),
    staleTime: 15_000,
  });
}

export function useStaffBookingDetail(bookingId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.adminBookingDetail(bookingId),
    queryFn: () =>
      apiClient.get<InspectionBookingDetail>(`/inspections/admin/bookings/${bookingId}/`),
    enabled: !!bookingId,
    staleTime: 10_000,
  });
}

function useStaffBookingAction(action: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, staff_note }: { bookingId: string; staff_note?: string }) =>
      apiClient.post<InspectionBookingDetail>(
        `/inspections/admin/bookings/${bookingId}/${action}/`,
        staff_note ? { staff_note } : undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.adminBookings });
      queryClient.invalidateQueries({ queryKey: adminListingKeys.cars });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

export function useApproveBooking() { return useStaffBookingAction("approve"); }
export function useRejectBooking() { return useStaffBookingAction("reject"); }
export function usePassInspection() { return useStaffBookingAction("pass"); }
export function useFailInspection() { return useStaffBookingAction("fail"); }
export function useMarkNoShow() { return useStaffBookingAction("no-show"); }
