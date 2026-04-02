import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manager Dashboard",
  description:
    "Restaurant analytics — revenue, loyalty tiers, popular items, and upcoming guest occasions",
};

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
