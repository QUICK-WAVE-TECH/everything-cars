import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/shared/types/api";
import type {
  AssistanceRequest,
  AttendeePayload,
  AvailabilitySummaryEntry,
  AvailableSlot,
  CarStatusHistoryEntry,
  FeeQuote,
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

/**
 * Bounds an availability read to a rolling forward window so the payload can't
 * grow without limit as more slots accumulate. Slot batches are capped at 300
 * days server-side, so a year covers all creatable upcoming availability.
 */
export function availabilityWindow(daysAhead = 365): {
  date_from: string;
  date_to: string;
} {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + daysAhead);
  return { date_from: iso(from), date_to: iso(to) };
}

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
  availableSlots: (
    centerId?: string,
    date?: string,
    range?: { date_from?: string; date_to?: string },
  ) =>
    [
      "inspections",
      "available-slots",
      centerId ?? "all",
      date ?? "all",
      range?.date_from ?? "all",
      range?.date_to ?? "all",
    ] as const,
  // Shares the ["inspections", "available-slots"] prefix so the existing
  // WebSocket invalidations refresh the summary too.
  availabilitySummary: (
    centerId?: string,
    range?: { date_from?: string; date_to?: string },
  ) =>
    [
      "inspections",
      "available-slots",
      "summary",
      centerId ?? "all",
      range?.date_from ?? "all",
      range?.date_to ?? "all",
    ] as const,
  locations: ["inspections", "locations"] as const,
  publicCenters: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "public-centers", params ?? {}] as const,
  adminCenters: ["inspections", "admin-centers"] as const,
  adminCentersList: (params?: Record<string, string | number | undefined>) =>
    ["inspections", "admin-centers", params ?? {}] as const,
  feeQuote: ["inspections", "fee-quote"] as const,
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

export function useAvailableSlots(
  centerId?: string,
  date?: string,
  range?: { date_from?: string; date_to?: string },
) {
  const query = buildQuery({
    center: centerId,
    date,
    date_from: range?.date_from,
    date_to: range?.date_to,
  });
  return useQuery({
    queryKey: inspectionKeys.availableSlots(centerId, date, range),
    queryFn: () =>
      apiClient.get<AvailableSlot[]>(
        `/inspections/available-slots/${query ? `?${query}` : ""}`,
      ),
    enabled: !!centerId,
    staleTime: 30_000,
  });
}

/**
 * Per-day availability counts for the calendar. One tiny row per day with open
 * slots — replaces fetching every slot row just to highlight dates.
 */
export function useAvailabilitySummary(
  centerId?: string,
  range?: { date_from?: string; date_to?: string },
) {
  const query = buildQuery({
    center: centerId,
    date_from: range?.date_from,
    date_to: range?.date_to,
  });
  return useQuery({
    queryKey: inspectionKeys.availabilitySummary(centerId, range),
    queryFn: () =>
      apiClient.get<AvailabilitySummaryEntry[]>(
        `/inspections/available-slots/summary/${query ? `?${query}` : ""}`,
      ),
    enabled: !!centerId,
    staleTime: 30_000,
  });
}

// ── Owner Bookings ──

/** The owner's up-front fee breakdown + platform bank details for the payment
 * step. */
export function useFeeQuote(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: inspectionKeys.feeQuote,
    queryFn: () => apiClient.get<FeeQuote>("/inspections/bookings/fee-quote/"),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export type CreateBookingInput = { car_id: string; slot_id: string } & AttendeePayload & {
  payment_method: "transfer" | "card";
  receipt: File;
};

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingInput) => {
      const fd = new FormData();
      fd.append("car_id", data.car_id);
      fd.append("slot_id", data.slot_id);
      fd.append("payment_method", data.payment_method);
      fd.append("receipt", data.receipt);
      if (data.attendee_type) fd.append("attendee_type", data.attendee_type);
      if (data.rep_name) fd.append("rep_name", data.rep_name);
      if (data.rep_id_type) fd.append("rep_id_type", data.rep_id_type);
      if (data.rep_id_number) fd.append("rep_id_number", data.rep_id_number);
      if (data.consent_accepted) fd.append("consent_accepted", "true");
      return apiClient.post<InspectionBooking>("/inspections/bookings/", fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.bookings });
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
      queryClient.invalidateQueries({ queryKey: listingKeys.owner });
    },
  });
}

// ── Staff inspection-payment review ──

export function useConfirmInspectionPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post<InspectionBookingDetail>(
        `/inspections/admin/bookings/${bookingId}/confirm-payment/`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.adminBookings });
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
    },
  });
}

export function useRejectInspectionPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      apiClient.post<InspectionBookingDetail>(
        `/inspections/admin/bookings/${bookingId}/reject-payment/`,
        { reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.adminBookings });
      queryClient.invalidateQueries({ queryKey: ["inspections", "available-slots"] });
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
    mutationFn: ({
      bookingId,
      slot_id,
      consent_accepted,
    }: {
      bookingId: string;
      slot_id: string;
      consent_accepted?: boolean;
    }) =>
      apiClient.post<InspectionBooking>(
        `/inspections/bookings/${bookingId}/reschedule/`,
        { slot_id, ...(consent_accepted !== undefined ? { consent_accepted } : {}) },
      ),
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
