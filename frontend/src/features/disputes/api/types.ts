export type DisputeStatus = "open" | "upheld" | "dismissed";

export type DisputeParty = {
  name: string;
  business_name: string;
  phone: string;
  email: string;
};

export type DisputeCar = {
  title: string;
  subtitle: string;
  primary_image: string | null;
};

export type DisputeDeal = {
  id: string;
  ref: string;
  car: DisputeCar;
  buyer: DisputeParty;
  seller: DisputeParty;
  amount: string;
  currency: string;
  created_at: string;
  completed_at: string | null;
  disputed_at: string;
  dispute_reason: string;
  dispute_status: DisputeStatus;
  resolution_note: string;
  resolved_at: string | null;
  resolved_by_name: string;
};

/** The tab filter — "all" spans every resolution state. */
export type DisputeTab = DisputeStatus | "all";

export type DisputeListParams = {
  status: DisputeTab;
  search: string;
  page: number;
};
