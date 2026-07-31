export type NotificationType =
  | "request_received"
  | "request_approved"
  | "request_rejected"
  | "request_cancelled"
  | "listing_suspended"
  | "listing_approved"
  | "listing_submitted"
  | "changes_requested"
  | "inspection_booked"
  | "inspection_booking_approved"
  | "inspection_booking_rejected"
  | "inspection_started"
  | "needs_clearance"
  | "clearance_response"
  | "inspection_passed"
  | "inspection_failed"
  | "inspection_no_show"
  | "inspection_rescheduled"
  | "inspection_cancelled"
  | "inspection_payment_submitted"
  | "inspection_payment_confirmed"
  | "inspection_payment_rejected"
  | "payment_submitted"
  | "payment_confirmed"
  | "rental_active"
  | "rental_completed"
  | "requests_auto_rejected"
  | "offer_submitted"
  | "offer_received"
  | "offer_countered"
  | "offer_accepted"
  | "offer_rejected"
  | "counter_accepted"
  | "counter_rejected"
  | "offer_expired"
  | "car_no_longer_available"
  | "system";

export type NotificationItem = {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
};

export type UnreadCountResponse = {
  unread_count: number;
};
