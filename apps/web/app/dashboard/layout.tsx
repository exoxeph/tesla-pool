import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passenger dashboard",
  description: "Request a shared ride and track your ride requests.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
