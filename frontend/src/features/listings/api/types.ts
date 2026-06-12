export type CarOwner = {
  id: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
};

export type CarImage = {
  id: string;
  image: string;
  is_primary: boolean;
  created_at: string;
};

export type ListingFeature = {
  id?: string;
  name: string;
  value: string;
  sort_order?: number;
};

export type CarListItem = {
  id: string;
  title: string;
  listing_type: "rent" | "buy" | "both";
  rent_price_per_day: string | null;
  sale_price: string | null;
  currency: string;
  brand: string;
  model: string;
  year: number;
  body_type: string;
  state: string;
  city: string;
  status: string;
  owner: CarOwner;
  primary_image: string | null;
  created_at: string;
};

export type CarDetail = CarListItem & {
  color: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  mileage: number | null;
  country: string;
  description: string;
  published_at: string | null;
  updated_at: string;
  images: CarImage[];
  features: ListingFeature[];
};
