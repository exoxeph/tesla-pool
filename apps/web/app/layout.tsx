import type { Metadata } from "next";
import { Martian_Mono, Teko, Work_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const teko = Teko({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const martianMono = Martian_Mono({ subsets: ["latin"], variable: "--font-meter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dhaka Tesla Pool", template: "%s · Dhaka Tesla Pool" },
  description: "A smarter way to share premium rides across Dhaka.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${teko.variable} ${workSans.variable} ${martianMono.variable}`}>
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
