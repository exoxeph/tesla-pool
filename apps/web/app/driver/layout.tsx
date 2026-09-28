import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver dashboard",
  description: "Manage your vehicle and availability.",
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
