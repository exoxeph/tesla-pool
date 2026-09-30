import Link from "next/link";
import { ArrowRight, LogoMark, Shield } from "@/components/icons";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="grid overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-soft lg:min-h-[680px] lg:grid-cols-[.82fr_1.18fr]">
        <aside className="noise relative hidden overflow-hidden bg-forest-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="route-grid absolute inset-0 opacity-20"/><div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full border-[42px] border-lime-300/15"/>
          <div className="relative"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 font-meter text-[9px] uppercase tracking-wider text-white/65"><Shield className="h-3.5 w-3.5 text-lime-300"/>Early-stage community MVP</div><h2 className="mt-12 font-display text-6xl font-semibold uppercase leading-[.86]">One city.<br/><span className="text-lime-300">Many routes.</span><br/>One first step.</h2><p className="mt-6 max-w-sm leading-relaxed text-white/58">Create an account and tell us how you commute. Real route demand will decide what the product builds next.</p></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-5"><p className="font-meter text-[9px] uppercase tracking-wider text-lime-300">Available in this MVP</p><ul className="mt-4 space-y-3 text-sm text-white/72"><li>Passenger and driver accounts</li><li>Real route matching, pooling &amp; fares</li><li>Full trip lifecycle, with CASH/TESLAPAY payment</li></ul></div>
        </aside>
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            <Link href="/" className="focus-ring mb-10 inline-flex items-center gap-2 rounded-xl lg:hidden"><LogoMark className="h-9 w-9 text-lime-300"/><span className="font-display text-xl uppercase">Dhaka Tesla Pool</span></Link>
            <p className="font-meter text-[9px] uppercase tracking-[.2em] text-forest-700">Welcome to the pool</p>
            <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[.9] text-ink-950 sm:text-6xl">{title}</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{description}</p>
            <div className="mt-8">{children}</div>
            <Link href="/" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-ink-500 transition hover:text-forest-700">Back to home <ArrowRight className="h-4 w-4"/></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
