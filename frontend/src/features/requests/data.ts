import type { IconName } from "@/features/auth/components/icon";

// ---------------------------------------------------------------------------
// Customer summary stats (shared by dashboard + requests pages)
// ---------------------------------------------------------------------------

export type StatItem = {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  color: string;
};

export const CUSTOMER_STATS: StatItem[] = [
  { label: "Total Requests", value: "3", icon: "car", color: "var(--brc-primary)" },
  { label: "Pending Requests", value: "2", icon: "clock", color: "var(--brc-warning)" },
  { label: "Approved Requests", value: "1", icon: "check", color: "var(--brc-success)" },
  { label: "Loyalty Point", value: "120", unit: "points", icon: "gift", color: "var(--brc-accent)" },
];

// ---------------------------------------------------------------------------
// Mock customer requests
// ---------------------------------------------------------------------------

export type RequestType = "Rent" | "Buy";
export type RequestStatus = "approved" | "pending" | "rejected";

export type CustomerRequest = {
  id: number;
  car: string;
  type: RequestType;
  requestDate: string;
  owner: string;
  customer: string;
  price: number;
  duration: string;
  color: string;
  requestedOn: string;
  status: RequestStatus;
};

export const CUSTOMER_REQUESTS: CustomerRequest[] = [
  { id: 1, car: "Lexus NS 350", type: "Rent", requestDate: "04 Nov 2025", owner: "Daniel Emmanuel", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "White", requestedOn: "10/29/2025", status: "approved" },
  { id: 2, car: "Lexus NS 350", type: "Rent", requestDate: "04 Nov 2025", owner: "Okon Nnamdi", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "Black", requestedOn: "10/29/2025", status: "pending" },
  { id: 3, car: "Lexus NS 350", type: "Buy", requestDate: "04 Nov 2025", owner: "Shalom Aderonke", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "Silver", requestedOn: "10/29/2025", status: "pending" },
  { id: 4, car: "Lexus NS 350", type: "Rent", requestDate: "04 Nov 2025", owner: "Daniel Emmanuel", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "White", requestedOn: "10/29/2025", status: "rejected" },
  { id: 5, car: "Lexus NS 350", type: "Rent", requestDate: "04 Nov 2025", owner: "Okon Nnamdi", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "Grey", requestedOn: "10/29/2025", status: "pending" },
  { id: 6, car: "Lexus NS 350", type: "Rent", requestDate: "04 Nov 2025", owner: "Shalom Aderonke", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "Blue", requestedOn: "10/29/2025", status: "rejected" },
  { id: 7, car: "Lexus NS 350", type: "Rent", requestDate: "04 Nov 2025", owner: "Hilary Emmanuel", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "White", requestedOn: "10/29/2025", status: "pending" },
  { id: 8, car: "Lexus NS 350", type: "Buy", requestDate: "03 Nov 2025", owner: "Premium Auto Gallery", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "Red", requestedOn: "10/28/2025", status: "approved" },
  { id: 9, car: "Lexus NS 350", type: "Rent", requestDate: "03 Nov 2025", owner: "Okon Nnamdi", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "Black", requestedOn: "10/28/2025", status: "pending" },
  { id: 10, car: "Lexus NS 350", type: "Rent", requestDate: "02 Nov 2025", owner: "Hilary Emmanuel", customer: "Daniel Emmanuel", price: 175000, duration: "5 days", color: "White", requestedOn: "10/27/2025", status: "pending" },
];

export function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

export function getCustomerRequest(id: number): CustomerRequest | undefined {
  return CUSTOMER_REQUESTS.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// Owner summary stats
// ---------------------------------------------------------------------------

export const OWNER_STATS: StatItem[] = [
  { label: "Total Requests", value: "8", icon: "car", color: "var(--brc-primary)" },
  { label: "Pending Requests", value: "3", icon: "clock", color: "var(--brc-warning)" },
  { label: "Approved Requests", value: "4", icon: "check", color: "var(--brc-success)" },
  { label: "Earnings", value: "₦420k", icon: "banknote", color: "var(--brc-accent)" },
];

// ---------------------------------------------------------------------------
// Mock owner requests (incoming from customers)
// ---------------------------------------------------------------------------

export type OwnerRequestStatus = "new" | "awaiting-payment" | "paid" | "rejected";

export type OwnerRequest = {
  id: number;
  car: string;
  type: RequestType;
  requestDate: string;
  customer: string;
  price: number;
  duration: string;
  color: string;
  year: number;
  transmission: string;
  fuelType: string;
  seats: number;
  requestedOn: string;
  status: OwnerRequestStatus;
};

export const OWNER_REQUESTS: OwnerRequest[] = [
  { id: 1, car: "Lexus NX 350", type: "Rent", requestDate: "04 Nov 2025", customer: "Chika Akor", price: 175000, duration: "5 days", color: "Grey", year: 2024, transmission: "Automatic", fuelType: "Petrol", seats: 4, requestedOn: "10/29/2025", status: "new" },
  { id: 2, car: "Toyota Camry", type: "Rent", requestDate: "04 Nov 2025", customer: "Emeka Obi", price: 120000, duration: "3 days", color: "Black", year: 2023, transmission: "Automatic", fuelType: "Petrol", seats: 5, requestedOn: "10/28/2025", status: "awaiting-payment" },
  { id: 3, car: "Honda Accord", type: "Buy", requestDate: "03 Nov 2025", customer: "Ngozi Eze", price: 8500000, duration: "N/A", color: "Silver", year: 2022, transmission: "Automatic", fuelType: "Petrol", seats: 5, requestedOn: "10/27/2025", status: "paid" },
  { id: 4, car: "Lexus NX 350", type: "Rent", requestDate: "02 Nov 2025", customer: "Bayo Adeyemi", price: 175000, duration: "2 days", color: "White", year: 2024, transmission: "Automatic", fuelType: "Petrol", seats: 4, requestedOn: "10/26/2025", status: "rejected" },
];

export function getOwnerRequest(id: number): OwnerRequest | undefined {
  return OWNER_REQUESTS.find((r) => r.id === id);
}
