import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cashier App",
  description: "POS order entry — build orders, confirm payments and sync to the loyalty system",
};

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
