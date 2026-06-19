export type NotificationType =
  | "request_received"
  | "request_approved"
  | "request_rejected"
  | "request_cancelled"
  | "listing_submitted"
  | "listing_approved"
  | "listing_rejected"
  | "listing_needs_changes"
  | "payment_submitted"
  | "payment_confirmed"
  | "rental_active"
  | "rental_completed"
  | "requests_auto_rejected"
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
