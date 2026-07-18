import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type {
  AssistanceRequest,
  AttendeePayload,
  AvailableSlot,
  CarStatusHistoryEntry,
  InspectionBooking,
  InspectionBookingDetail,
  InspectionCenter,
  InspectionSlot,
  LocationCountry,
  PhysicalInspection,
  PhysicalInspectionPayload,
  SlotTimeRow,
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
  slotsList: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "slots", params ?? {}] as const,
  availableSlots: (centerId?: string, date?: string) =>
    ["inspections", "available-slots", centerId ?? "all", date ?? "all"] as const,
  locations: ["inspections", "locations"] as const,
  publicCenters: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "public-centers", params ?? {}] as const,
  adminCenters: ["inspections", "admin-centers"] as const,
  adminCentersList: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "admin-centers", params ?? {}] as const,
  bookings: ["inspections", "bookings"] as const,
  myBookings: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "bookings", "my", params ?? {}] as const,
  adminBookings: ["inspections", "admin-bookings"] as const,
  adminBookingsList: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "admin-bookings", params ?? {}] as const,
  adminBookingDetail: (id: string | null) =>
    ["inspections", "admin-bookings", "detail", id] as const,
  carHistory: (carId: string | null) =>
    ["inspections", "car-history", carId] as const,
  staffCarHistory: (carId: string | null) =>
    ["inspections", "staff-car-history", carId] as const,
  assistance: ["inspections", "assistance"] as const,
  assistanceList: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "assistance", params ?? {}] as const,
  myAssistance: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "assistance", "my", params ?? {}] as const,
};

// ── Staff Center Management ──

export function useAdminCenters(params?: { is_active?: string; search?: string; page_size?: number }) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.adminCentersList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<InspectionCenter>>(
        `/inspections/admin/centers/${query ? `?${query}` : ""}`,
      ),
    staleTime: 30_000,
  });
}

export function useCreateCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InspectionCenter>) =>
      apiClient.post<InspectionCenter>("/inspections/admin/centers/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.adminCenters });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.locations });
    },
  });
}

export function useUpdateCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ centerId, ...data }: Partial<InspectionCenter> & { centerId: string }) =>
      apiClient.patch<InspectionCenter>(`/inspections/admin/centers/${centerId}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.adminCenters });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.locations });
    },
  });
}

// ── Owner Location Discovery ──

export function useLocations() {
  return useQuery({
    queryKey: inspectionKeys.locations,
    queryFn: () => apiClient.get<LocationCountry[]>("/inspections/locations/"),
    staleTime: 5 * 60_000,
  });
}

export function useCentersByCity(params: {
  country?: string;
  state?: string;
  city?: string;
}) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.publicCenters(params),
    queryFn: () =>
      apiClient.get<InspectionCenter[]>(
        `/inspections/centers/${query ? `?${query}` : ""}`,
      ),
    enabled: !!params.city,
    staleTime: 60_000,
  });
}

// ── Staff Slot Management ──

export function useStaffSlots(params?: { date_from?: string; date_to?: string; is_active?: string; page_size?: number }) {
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
      time_slots: SlotTimeRow[];
      capacity: number;
      center: string;
    }) => apiClient.post<{ created_count: number; slots: InspectionSlot[] }>("/inspections/slots/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.slots });
    },
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, ...data }: { slotId: string; capacity?: number; center?: string; note?: string; is_active?: boolean }) =>
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

export function useAvailableSlots(centerId?: string, date?: string) {
  const query = buildQuery({ center: centerId, date });
  return useQuery({
    queryKey: inspectionKeys.availableSlots(centerId, date),
    queryFn: () =>
      apiClient.get<AvailableSlot[]>(
        `/inspections/available-slots/${query ? `?${query}` : ""}`,
      ),
    enabled: !!centerId,
    staleTime: 30_000,
  });
}

// ── Owner Bookings ──

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { car_id: string; slot_id: string } & AttendeePayload) =>
      apiClient.post<InspectionBooking>("/inspections/bookings/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.bookings });
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

export function useMyBookings(params?: { car?: string; page_size?: number }, options?: { enabled?: boolean }) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.myBookings(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<InspectionBooking>>(
        `/inspections/bookings/my/${query ? `?${query}` : ""}`,
      ),
    enabled: options?.enabled ?? true,
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
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
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
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.slots });
    },
  });
}

export function useClearanceResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, message }: { bookingId: string; message: string }) =>
      apiClient.post(`/inspections/bookings/${bookingId}/clearance-response/`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.bookings });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

// ── Owner Car Timeline ──

export function useCarHistory(carId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.carHistory(carId),
    queryFn: () =>
      apiClient.get<CarStatusHistoryEntry[]>(`/listings/my-cars/${carId}/history`),
    enabled: !!carId,
    staleTime: 15_000,
  });
}

// ── Staff Booking Management & Physical Inspection ──

export function useStaffBookings(
  params?: { status?: string; date?: string; car?: string },
  options?: { enabled?: boolean },
) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.adminBookingsList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<InspectionBooking>>(
        `/inspections/admin/bookings/${query ? `?${query}` : ""}`,
      ),
    enabled: options?.enabled ?? true,
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

function invalidateBookingCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: inspectionKeys.adminBookings });
  queryClient.invalidateQueries({ queryKey: adminListingKeys.cars });
  queryClient.invalidateQueries({ queryKey: listingKeys.owner });
}

export function useStartInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post<InspectionBookingDetail>(
        `/inspections/admin/bookings/${bookingId}/start/`,
      ),
    onSuccess: () => invalidateBookingCaches(queryClient),
  });
}

export function useSubmitInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: PhysicalInspectionPayload | FormData;
    }) =>
      apiClient.post<PhysicalInspection>(
        `/inspections/admin/bookings/${bookingId}/inspection/`,
        data,
      ),
    onSuccess: () => invalidateBookingCaches(queryClient),
  });
}

export function useUploadInspectionDocs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, formData }: { inspectionId: string; formData: FormData }) =>
      apiClient.post(
        `/inspections/admin/inspections/${inspectionId}/documents/`,
        formData,
      ),
    onSuccess: () => invalidateBookingCaches(queryClient),
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId }: { bookingId: string }) =>
      apiClient.post<InspectionBookingDetail>(
        `/inspections/admin/bookings/${bookingId}/no-show/`,
      ),
    onSuccess: () => invalidateBookingCaches(queryClient),
  });
}

export function useResolveClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      action,
      staff_note,
    }: {
      bookingId: string;
      action: "publish" | "reject";
      staff_note?: string;
    }) =>
      apiClient.post<InspectionBookingDetail>(
        `/inspections/admin/bookings/${bookingId}/clearance/`,
        { action, ...(staff_note ? { staff_note } : {}) },
      ),
    onSuccess: () => invalidateBookingCaches(queryClient),
  });
}

// ── Staff Car Timeline (includes actor names) ──

export function useStaffCarHistory(carId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.staffCarHistory(carId),
    queryFn: () =>
      apiClient.get<CarStatusHistoryEntry[]>(`/listings/admin/cars/${carId}/history`),
    enabled: !!carId,
    staleTime: 15_000,
  });
}

// ── Assistance Requests ──

export function useCreateAssistanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      car_id?: string;
      country?: string;
      state?: string;
      message?: string;
    }) => apiClient.post<AssistanceRequest>("/inspections/assistance/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.assistance });
    },
  });
}

export function useMyAssistanceRequests(
  params?: { car?: string; status?: string },
  options?: { enabled?: boolean },
) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.myAssistance(params),
    queryFn: () =>
      apiClient.get<AssistanceRequest[]>(
        `/inspections/assistance/${query ? `?${query}` : ""}`,
      ),
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  });
}

export function useAssistanceRequests(params?: { status?: string; page_size?: number }) {
  const query = buildQuery(params);
  return useQuery({
    queryKey: inspectionKeys.assistanceList(params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<AssistanceRequest>>(
        `/inspections/admin/assistance/${query ? `?${query}` : ""}`,
      ),
    staleTime: 15_000,
  });
}

export function useHandleAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.post<AssistanceRequest>(
        `/inspections/admin/assistance/${requestId}/handle/`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.assistance });
    },
  });
}

export function useBookForOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { car_id: string; slot_id: string } & AttendeePayload) =>
      apiClient.post<InspectionBookingDetail>(
        "/inspections/admin/bookings/book-for-owner/",
        data,
      ),
    onSuccess: () => {
      invalidateBookingCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: inspectionKeys.assistance });
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
    },
  });
}
