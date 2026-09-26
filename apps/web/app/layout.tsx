import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhaka Tesla Pool",
  description: "Ride-pooling MVP for shared Tesla rides across Dhaka.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
