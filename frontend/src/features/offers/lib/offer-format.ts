import type { OfferStatus } from "@/features/offers/api";

const CURRENCY_SYMBOL: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

/** ₦16,500,000 — symbol for known currencies, code otherwise. Always integer. */
export function formatOfferAmount(
  amount: string | number | null | undefined,
  currency = "NGN",
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${Number(amount).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

type StatusTone = "navy" | "amber" | "success" | "muted";

type StatusMeta = { label: string; tone: StatusTone };

/**
 * How each offer status reads to a human.
 *
 * `superseded` deliberately shows "Closed — vehicle sold": the API status is
 * about *this offer* losing, but to the buyer it means the car is gone. Declined
 * / withdrawn / expired are muted, never danger-red — the buyer did nothing wrong.
 */
export const OFFER_STATUS_META: Record<OfferStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "navy" },
  countered: { label: "Countered", tone: "amber" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Declined", tone: "muted" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
  expired: { label: "Expired", tone: "muted" },
  standby: { label: "On standby", tone: "amber" },
  superseded: { label: "Closed — vehicle sold", tone: "muted" },
};

/** Offers still awaiting a decision — used to split Active vs Closed. */
export function isActiveOfferStatus(status: OfferStatus): boolean {
  return status === "pending" || status === "countered";
}

/** The amount a sale would settle at: the counter if there is one, else the offer. */
export function agreedAmount(offer: {
  amount: string;
  counter_amount: string | null;
}): string {
  return offer.counter_amount ?? offer.amount;
}
