import Link from "next/link";
import { CityBackdrop } from "@/components/city-backdrop";
import { FareGauge } from "@/components/fare-gauge";
import { ArrowRight, ArrowUpRight, Car, MapPin, Shield, Users } from "@/components/icons";
import { ZoneStrip } from "@/components/zone-strip";

const FEATURES = [
  { icon: Users, number: "01", title: "Request a ride", copy: "Pick a pickup and destination zone and see a real, computed fare before you send the request." },
  { icon: Car, number: "02", title: "Get matched, not just a car", copy: "A driver accepts and pools you with a compatible rider on the same route — 15% off for whoever joins." },
  { icon: Shield, number: "03", title: "Track it end to end", copy: "Every step — driver arrival, start, completion — is tracked and paid, in cash or the built-in wallet." },
];

export default function HomePage() {
  return (
    <main>
      <section className="noise relative overflow-hidden bg-forest-900 text-white">
        <div className="absolute bottom-0 right-0 top-0 w-full opacity-80 lg:w-[58%]"><CityBackdrop /></div>
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="float-in max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-2 font-meter text-[9px] uppercase tracking-[0.16em] text-white/75"><span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_0_4px_rgba(220,255,114,.13)]"/>Community MVP · Early access</div>
            <h1 className="display-tight font-display text-[4.7rem] font-semibold uppercase leading-[.8] sm:text-[6.5rem] lg:text-[7.5rem]">Dhaka moves<br/><span className="text-lime-300">better</span> together.</h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/66 sm:text-xl">We&apos;re testing a simpler way for Dhaka commuters to share electric rides. Join early, add your route, and help shape what gets built next.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/signup?role=passenger" className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-lime-300 px-6 py-4 font-semibold text-forest-950 transition hover:bg-lime-200">Join as a passenger <ArrowRight className="h-5 w-5"/></Link><Link href="/signup?role=driver" className="focus-ring inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/[0.06] px-6 py-4 font-medium text-white transition hover:bg-white/10">Join as a driver <ArrowUpRight className="h-5 w-5"/></Link></div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/55"><span className="flex items-center gap-2"><Shield className="h-4 w-4 text-lime-300"/>MVP scope shown clearly</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-lime-300"/>Built around Dhaka commutes</span></div>
          </div>
          <div className="relative py-8"><FareGauge /></div>
        </div>
      </section>

      <section className="border-b border-line bg-surface-raised">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line px-5 sm:grid-cols-4 sm:px-8">
          {[['01','Create an account'],['02','Request or accept a ride'],['03','Get matched & pooled'],['04','Track it to completion']].map(([value,label])=><div key={label} className="px-3 py-7 text-center sm:py-9"><p className="font-display text-4xl font-semibold leading-none text-forest-800 sm:text-5xl">{value}</p><p className="mt-1 text-xs text-ink-500">{label}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-xl"><p className="font-meter text-[10px] uppercase tracking-[0.2em] text-forest-700">How it works</p><h2 className="mt-3 font-display text-5xl font-semibold uppercase leading-[.9] text-ink-950 sm:text-6xl">A real ride,<br/>start to finish.</h2></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">{FEATURES.map(({icon:Icon,number,title,copy},i)=><article key={title} className={`group rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-soft sm:p-8 ${i===1?"border-forest-800 bg-forest-800 text-white":"border-line bg-surface-raised text-ink-900"}`}><div className="flex items-center justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${i===1?"bg-lime-300 text-forest-950":"bg-surface-muted text-forest-700"}`}><Icon className="h-5 w-5"/></span><span className={`font-meter text-xs ${i===1?"text-lime-300":"text-ink-500"}`}>{number}</span></div><h3 className="mt-10 text-xl font-semibold">{title}</h3><p className={`mt-2 leading-relaxed ${i===1?"text-white/60":"text-ink-500"}`}>{copy}</p></article>)}</div>
      </section>

      <ZoneStrip />

      <section className="px-5 pb-16 sm:px-8 sm:pb-24"><div className="noise relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-mango-400 px-6 py-12 text-forest-950 sm:px-12 sm:py-16"><div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[45px] border-forest-900/10"/><div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-meter text-[10px] uppercase tracking-[.2em]">Join at the beginning</p><h2 className="mt-3 max-w-2xl font-display text-5xl font-semibold uppercase leading-[.88] sm:text-7xl">Add your route.<br/>Shape the MVP.</h2></div><Link href="/signup" className="focus-ring inline-flex shrink-0 items-center justify-center gap-3 self-start rounded-full bg-forest-900 px-7 py-4 font-semibold text-white transition hover:bg-forest-950 lg:self-auto">Create your account <ArrowUpRight className="h-5 w-5"/></Link></div></div></section>
    </main>
  );
}
