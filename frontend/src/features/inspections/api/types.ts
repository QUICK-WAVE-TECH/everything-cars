export type InspectionCenter = {
  id: string;
  company_name: string;
  address: string;
  country: string;
  country_code: string;
  state: string;
  city: string;
  city_code: string;
  phone: string;
  email: string;
  max_reschedules: number;
  is_active: boolean;
  created_at: string;
};

export type LocationState = {
  state: string;
  cities: string[];
};

export type LocationCountry = {
  /** ISO code, e.g. "NG" — used as the filter value for center queries. */
  country: string;
  /** Full display name, e.g. "Nigeria". */
  country_name: string;
  states: LocationState[];
};

export type InspectionSlot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  center: InspectionCenter;
  center_name: string;
  center_city: string;
  note: string;
  is_active: boolean;
  created_by_name: string;
  bookings_count: number;
  created_at: string;
};

export type AvailableSlot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  center: InspectionCenter;
  spots_remaining: number;
};

/** One row per day with open slots — powers calendar highlighting without
 * shipping every slot row. */
export type AvailabilitySummaryEntry = {
  date: string;
  open_count: number;
};

export type IdType = "intl_passport" | "nin" | "voters_card" | "drivers_licence";

export type AttendeeType = "self" | "representative";

export type BookingStatus =
  | "awaiting_payment"
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "no_show"
  | "cancelled";

export type InspectionBooking = {
  id: string;
  car_id: string;
  car_title: string;
  slot: InspectionSlot;
  booked_by_name: string;
  status: BookingStatus;
  reschedule_count: number;
  staff_note: string;
  attendee_type: AttendeeType;
  rep_name: string;
  created_at: string;
  updated_at: string;
};

/** The owner's up-front fee breakdown (inspection + listing + VAT) plus the
 * platform bank details shown on the payment step. */
export type FeeQuote = {
  inspection_fee: string;
  listing_fee: string;
  subtotal: string;
  vat_amount: string;
  total: string;
  currency: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
};

/** Snapshotted payment tied to a booking — staff-facing detail. */
export type InspectionPayment = {
  inspection_fee: string;
  listing_fee: string;
  vat_amount: string;
  total: string;
  currency: string;
  payment_method: "transfer" | "card";
  status: "submitted" | "confirmed" | "rejected";
  staff_note: string;
  submitted_at: string;
  confirmed_at: string | null;
  receipt_url: string | null;
};

/** Files + fields the inspector recorded — staff-only. */
export type StaffInspectionRecord = {
  id: string;
  result: "passed" | "needs_clearance" | "failed";
  mileage: number;
  fuel_type: string;
  staff_notes: string;
  presented_attendee: "owner" | "representative" | "other" | "";
  presented_id_type: IdType | "";
  presented_id_number: string;
  presented_id_document: string | null;
  inspected_at: string;
  inspector_name: string;
  inspector_email: string;
  documents: {
    id: string;
    car_documents: string | null;
    receipt_upload: string | null;
    custom_duty_status: string;
    receipt_type: string;
    additional_notes: string;
  } | null;
};

/** Staff-only booking detail — includes the representative's ID (never on the
 * owner-facing list). */
export type InspectionBookingDetail = Omit<InspectionBooking, "car_id" | "car_title"> & {
  car: import("@/features/listings/api/types").CarDetail;
  rep_id_type: IdType | "";
  rep_id_number: string;
  inspection: StaffInspectionRecord | null;
  payment: InspectionPayment | null;
};

/** Attendee declaration sent when creating a booking. `attendee_type` defaults
 * to "self" server-side, so it's optional on the wire. */
export type AttendeePayload = {
  attendee_type?: AttendeeType;
  rep_name?: string;
  rep_id_type?: IdType | "";
  rep_id_number?: string;
  consent_accepted?: boolean;
};

export type AssistanceRequest = {
  id: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  car: string | null;
  car_title: string;
  country: string;
  state: string;
  message: string;
  status: "open" | "handled";
  created_at: string;
  handled_at: string | null;
};

export type PhysicalInspectionPayload = {
  condition: "used" | "brand_new";
  mileage: number;
  fuel_type: "petrol" | "diesel" | "hybrid" | "electric";
  car_type: "foreign_used" | "brand_new" | "local_used";
  features: string[];
  engine_condition: "excellent" | "good" | "fair" | "poor";
  chassis_condition: "excellent" | "good" | "fair" | "poor";
  ac_condition: "excellent" | "good" | "fair" | "poor";
  is_flooded: boolean;
  has_accident_history: boolean;
  staff_notes: string;
  result: "passed" | "needs_clearance" | "failed";
  /** Day-of identity capture — required for non-failed results. Staff-only. */
  presented_attendee?: "owner" | "representative" | "other" | "";
  presented_id_type?: IdType | "";
  presented_id_number?: string;
};

export type PhysicalInspection = PhysicalInspectionPayload & {
  id: string;
  inspector_name: string;
  inspected_at: string;
  created_at: string;
};

export type CarFieldChange = {
  field: string;
  label: string;
  old: string;
  new: string;
};

export type CarStatusHistoryEntry = {
  id: string;
  from_status: string;
  to_status: string;
  actor_role: "owner" | "staff" | "system";
  note: string;
  created_at: string;
  /** Staff timeline: any actor. Owner timeline: business-side actors only
   * (owner/team member), blank for platform staff. */
  actor_name?: string;
  /** Set on listing-edit rows (from_status === to_status): the fields that
   * changed, old → new. */
  changed_fields?: CarFieldChange[] | null;
};

/** One time-slot row in the batch slot-creation payload — capacity is optional
 * and falls back to the top-level default. */
export type SlotTimeRow = {
  start_time: string;
  end_time: string;
  capacity?: number;
};
