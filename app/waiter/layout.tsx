import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waiter App",
  description: "Guest loyalty lookup for waiters — search guests, view history and family profiles",
};

export default function WaiterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
