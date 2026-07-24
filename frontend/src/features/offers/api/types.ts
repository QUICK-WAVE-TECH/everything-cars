/**
 * Offer negotiation types. Mirrors apps/offers/serializers.py.
 *
 * Privacy: the owner's private range (min_price/max_price) is NEVER in any of
 * these payloads — it lives only in the owner's respond endpoint, out of scope
 * here. A customer likewise never learns competing bids or how many rivals exist.
 */

export type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired"
  | "superseded";

/** Offers still awaiting a decision from someone. */
export const ACTIVE_OFFER_STATUSES: OfferStatus[] = ["pending", "countered"];

export type OfferCarSummary = {
  id: string;
  title: string;
  sale_price: string;
  primary_image: string | null;
};

/** The buyer, as the owner sees them: name always, contact only once accepted. */
export type OfferBuyer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

type OfferBase = {
  id: string;
  car: OfferCarSummary;
  amount: string;
  currency: string;
  message: string;
  status: OfferStatus;
  counter_amount: string | null;
  counter_message: string;
  countered_at: string | null;
  expires_at: string;
  responded_at: string | null;
  resulting_request: string | null;
  is_expired: boolean;
  created_at: string;
};

/** A customer's own offer (GET /my-offers, POST responses). */
export type Offer = OfferBase;

/** An offer as the owner sees it (GET /owner-offers) — adds the buyer block. */
export type OwnerOffer = OfferBase & {
  customer: OfferBuyer;
};

export type PlaceOfferPayload = {
  amount: string;
  message?: string;
};

/** Owner: accept | reject | counter. Customer: accept | reject (a counter). */
export type OfferRespondPayload = {
  action: "accept" | "reject" | "counter";
  counter_amount?: string;
  message?: string;
};

export type OwnerOfferFilters = {
  status?: OfferStatus;
  car?: string;
};

/**
 * The owner's private acceptable range for one of their cars. Fetched lazily by
 * the respond sheet — never part of any offer list payload, so a buyer can't
 * see it.
 */
export type OwnerCarRange = {
  min_price: string | null;
  max_price: string | null;
  sale_price: string | null;
  currency: string;
};
