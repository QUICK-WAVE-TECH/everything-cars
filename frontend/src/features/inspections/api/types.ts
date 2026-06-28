export type InspectionSlot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  location: string;
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
  location: string;
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
