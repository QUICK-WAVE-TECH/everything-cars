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
  country: string;
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

export type InspectionBooking = {
  id: string;
  car_id: string;
  car_title: string;
  slot: InspectionSlot;
  booked_by_name: string;
  status: "pending" | "approved" | "rejected" | "completed" | "no_show" | "cancelled";
  reschedule_count: number;
  staff_note: string;
  created_at: string;
  updated_at: string;
};

export type InspectionBookingDetail = Omit<InspectionBooking, "car_id" | "car_title"> & {
  car: import("@/features/listings/api/types").CarDetail;
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
};

export type PhysicalInspection = PhysicalInspectionPayload & {
  id: string;
  inspector_name: string;
  inspected_at: string;
  created_at: string;
};

export type CarStatusHistoryEntry = {
  id: string;
  from_status: string;
  to_status: string;
  actor_role: "owner" | "staff" | "system";
  note: string;
  created_at: string;
};
