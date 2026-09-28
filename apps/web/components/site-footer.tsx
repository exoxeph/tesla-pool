import Link from "next/link";
import { LogoMark } from "@/components/icons";

export function SiteFooter() {
  return <footer className="bg-forest-950 text-white"><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12"><div className="flex flex-col gap-8 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><LogoMark className="h-10 w-10 text-lime-300"/><div><p className="font-display text-xl uppercase tracking-wide">Dhaka Tesla Pool</p><p className="text-sm text-white/55">An early community mobility MVP.</p></div></div><div className="flex gap-6 text-sm text-white/65"><Link className="transition hover:text-white" href="/signup?role=passenger">Passenger</Link><Link className="transition hover:text-white" href="/signup?role=driver">Driver</Link><Link className="transition hover:text-white" href="/login">Log in</Link></div></div><div className="flex flex-col gap-2 pt-6 font-meter text-[9px] uppercase tracking-[0.12em] text-white/40 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} Dhaka Tesla Pool</p><p>Independent community MVP · Not affiliated with Tesla, Inc.</p></div></div></footer>;
}
