export type CarImageType =
  | "front"
  | "back"
  | "left_side"
  | "right_side"
  | "interior";

export type CarImageFiles = Partial<Record<CarImageType, File>>;

export type CarOwner = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_joined: string;
  is_verified: boolean;
  listing_count: number;
};

export type CarImage = {
  id: string;
  image: string;
  thumbnail: string | null;
  image_type: CarImageType | "";
  is_primary: boolean;
  created_at: string;
};

export type ListingFeature = {
  id?: string;
  name: string;
  value: string;
  sort_order?: number;
};

export type BookedPeriod = {
  start_date: string;
  end_date: string;
  status: string;
};

export type ListingType = "rent" | "buy";

export type CarListItem = {
  id: string;
  title: string;
  /** A car is listed for rent XOR buy — never both. */
  listing_type: ListingType;
  rent_price_per_day: string | null;
  sale_price: string | null;
  /** Buy listings only (null on rent). Public — drives the "Negotiable" badge.
   * The owner's private min/max range behind it is never public. */
  is_negotiable: boolean | null;
  currency: string;
  brand: string;
  model: string;
  year: number;
  body_type: string;
  state: string;
  city: string;
  status: string;
  availability_status: "available" | "rented" | "reserved" | "sold" | "archived";
  owner: CarOwner;
  primary_image: string | null;
  created_at: string;
  /** True when the car has a passed physical inspection — drives the
   * "Verified" badge. Distinct from CarOwner.is_verified (KYC). */
  is_verified: boolean;
};

/** Inspector-verified condition report, present on public detail once a car has
 * passed inspection. Never contains ID or staff-identity data. */
export type VerifiedReport = {
  condition: string;
  car_type: string;
  mileage: number;
  fuel_type: string;
  features: string[];
  engine_condition: string;
  chassis_condition: string;
  ac_condition: string;
  is_flooded: boolean;
  has_accident_history: boolean;
  notes: string;
  inspected_at: string;
};

export type CarDetail = CarListItem & {
  color: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  mileage: number | null;
  country: string;
  description: string;
  tracking_id: string | null;
  admin_note: string;
  published_at: string | null;
  updated_at: string;
  images: CarImage[];
  features: ListingFeature[];
  booked_periods: BookedPeriod[];
  available_from: string | null;
  verified_report: VerifiedReport | null;
  /** Owner- and staff-only. Absent from every public payload, so these are
   * optional: never assume they exist on a publicly-fetched car. */
  vin?: string | null;
  plate_number?: string | null;
  min_price?: string | null;
  max_price?: string | null;
};
