export type DealStatus = "active" | "completed" | "cancelled";

export type DealParty = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  business_name: string;
};

export type DealCar = {
  id: string;
  title: string;
  vin: string | null;
  primary_image: string | null;
};

export type Deal = {
  id: string;
  status: DealStatus;
  agreed_amount: string;
  currency: string;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  disputed_at: string | null;
  car: DealCar;
  seller: DealParty;
  buyer: DealParty;
  viewer_role: "buyer" | "seller";
};
