import type { CarDetail } from "@/features/listings/api/types";

/** A row in the publisher's "Pending Publishing" queue. */
export type PendingPublishingRow = {
  car_id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  thumbnail: string | null;
  business_name: string;
  branch_name: string;
  inspector_name: string;
  inspected_at: string | null;
};

export type InspectionEditEvent = {
  action: "created" | "edited";
  editor_name: string;
  changed_fields: string[];
  created_at: string;
};

export type InspectionDocuments = {
  id: string;
  car_documents: string | null;
  receipt_upload: string | null;
  custom_duty_status: string;
  receipt_type: string;
  additional_notes: string;
  created_at: string;
};

/** The inspection report a publisher reviews before publishing. */
export type InspectionReport = {
  result: string;
  condition: string;
  mileage: number;
  fuel_type: string;
  car_type: string;
  features: string[];
  engine_condition: string;
  chassis_condition: string;
  ac_condition: string;
  is_flooded: boolean;
  has_accident_history: boolean;
  staff_notes: string;
  inspector_name: string;
  inspector_email: string;
  inspected_at: string;
  presented_attendee: string;
  presented_id_type: string;
  presented_id_number: string;
  presented_id_document: string | null;
  documents: InspectionDocuments | null;
  edit_history: InspectionEditEvent[];
};

/** The review detail: the full listing plus its inspection report. */
export type PublishingDetail = CarDetail & {
  inspection: InspectionReport | null;
};
