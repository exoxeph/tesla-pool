import type { Metadata } from "next";
import { Martian_Mono, Teko, Work_Sans } from "next/font/google";
import { CityBackdrop } from "@/components/city-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Display: Teko — condensed stamped-signage caps, for headlines and the
// wordmark. Body: Work Sans — plain, legible, carries all reading text.
// Meter: Martian Mono — reserved for the fare/seat-count numeral motif.
const teko = Teko({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-meter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dhaka Tesla Pool",
  description: "Share a seat, split the fare, survive Dhaka traffic.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${teko.variable} ${workSans.variable} ${martianMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-surface font-sans text-ink-900">
        <CityBackdrop />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
