import Link from "next/link";
import { ArrowRight, MapPin } from "@/components/icons";

const ROUTE_EXAMPLES = ["Home → office", "Campus → home", "Daily commute", "Regular errand"];

export function ZoneStrip() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="routes-title">
      <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
        <div><p className="font-meter text-[10px] uppercase tracking-[0.2em] text-forest-700">Route discovery</p><h2 id="routes-title" className="mt-3 font-display text-5xl font-semibold uppercase leading-[.9] text-ink-950 sm:text-6xl">Help shape<br/>where we start.</h2><p className="mt-5 max-w-md leading-relaxed text-ink-500">The MVP is collecting real commuter routes before claiming coverage. Add yours and help us find the first useful corridors.</p></div>
        <div className="rounded-3xl border border-line bg-surface-raised p-6 shadow-card sm:p-8"><div className="flex flex-wrap gap-2.5">{ROUTE_EXAMPLES.map((route,i)=><span key={route} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium ${i===0?"border-forest-800 bg-forest-800 text-white":"border-line bg-white text-ink-700"}`}><MapPin className={`h-3.5 w-3.5 ${i===0?"text-lime-300":"text-forest-700"}`}/>{route}</span>)}</div><Link href="/signup?role=passenger" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-forest-700">Share your usual route <ArrowRight className="h-4 w-4"/></Link></div>
      </div>
    </section>
  );
}
