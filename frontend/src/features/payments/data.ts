export type TransactionType = "Rental" | "Purchase" | "Refund";
export type PaymentMethod = "Credit Card" | "Pay Stack" | "Opay Transfer";
export type TransactionStatus = "Success" | "Failed";

export type Transaction = {
  id: number;
  description: string;
  type: TransactionType;
  paymentDate: string;
  method: PaymentMethod;
  amount: number;
  status: TransactionStatus;
};

export const TRANSACTIONS: Transaction[] = [
  { id: 1, description: "Rental Payment-Lexus NS 350", type: "Rental", paymentDate: "04 Nov 2025", method: "Credit Card", amount: 175000, status: "Success" },
  { id: 2, description: "Car Purchase-Lexus NS 350", type: "Purchase", paymentDate: "04 Nov 2025", method: "Credit Card", amount: 175000, status: "Success" },
  { id: 3, description: "Rental Payment-Lexus NS 350", type: "Rental", paymentDate: "04 Nov 2025", method: "Pay Stack", amount: 175000, status: "Success" },
  { id: 4, description: "Rental Payment-Lexus NS 350", type: "Refund", paymentDate: "04 Nov 2025", method: "Opay Transfer", amount: 175000, status: "Failed" },
  { id: 5, description: "Car Purchase-Lexus NS 350", type: "Purchase", paymentDate: "04 Nov 2025", method: "Pay Stack", amount: 175000, status: "Success" },
  { id: 6, description: "Rental Payment-Lexus NS 350", type: "Rental", paymentDate: "04 Nov 2025", method: "Credit Card", amount: 175000, status: "Success" },
  { id: 7, description: "Rental Payment-Lexus NS 350", type: "Rental", paymentDate: "03 Nov 2025", method: "Pay Stack", amount: 175000, status: "Success" },
  { id: 8, description: "Car Purchase-Lexus NS 350", type: "Purchase", paymentDate: "03 Nov 2025", method: "Opay Transfer", amount: 175000, status: "Failed" },
  { id: 9, description: "Rental Payment-Lexus NS 350", type: "Refund", paymentDate: "02 Nov 2025", method: "Credit Card", amount: 175000, status: "Success" },
  { id: 10, description: "Rental Payment-Lexus NS 350", type: "Rental", paymentDate: "02 Nov 2025", method: "Credit Card", amount: 175000, status: "Success" },
];

export type RentalSummary = {
  car: string;
  rating: number;
  reviewers: string;
  subtotal: number;
  tax: number;
};

export const RENTAL_SUMMARY: RentalSummary = {
  car: "Lexus NX 300h",
  rating: 4,
  reviewers: "440+",
  subtotal: 175000,
  tax: 500,
};

export function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

export function getTransaction(id: number): Transaction | undefined {
  return TRANSACTIONS.find((t) => t.id === id);
}
