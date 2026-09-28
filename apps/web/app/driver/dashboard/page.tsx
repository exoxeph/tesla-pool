"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authedFetch, getAuthToken } from "@/lib/auth-client";
import { SeatPicker } from "@/components/seat-picker";
import { Car, Clock, MapPin, Shield, Users } from "@/components/icons";

type Tesla = { id: string; label: string; capacity: number; isOnline: boolean };

export default function DriverDashboardPage() {
  const router = useRouter();
  const [tesla, setTesla] = useState<Tesla | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAuthToken()) { router.push("/login?role=driver"); return; }
    authedFetch<{ tesla: Tesla }>("/drivers/me")
      .then((data) => setTesla(data.tesla))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."))
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleToggle() {
    if (!tesla) return;
    setToggleError(null); setIsToggling(true);
    try {
      const data = await authedFetch<{ tesla: Tesla }>("/drivers/me/status", { method: "PATCH", body: { isOnline: !tesla.isOnline } });
      setTesla(data.tesla);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Couldn't update your status. Check your connection and try again.");
    } finally { setIsToggling(false); }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-meter text-[9px] uppercase tracking-[.2em] text-forest-700">Driver dashboard · MVP</p><h1 className="mt-2 font-display text-5xl font-semibold uppercase leading-none text-ink-950 sm:text-6xl">Set your availability.</h1><p className="mt-3 text-ink-500">Manage your registered vehicle and availability status.</p></div>{tesla && <span className={`inline-flex self-start items-center gap-2 rounded-full px-4 py-2 font-meter text-[9px] font-semibold uppercase tracking-wider ${tesla.isOnline ? "bg-lime-300 text-forest-950" : "bg-surface-muted text-ink-500"}`}><span className={`h-2 w-2 rounded-full ${tesla.isOnline ? "bg-forest-700" : "bg-ink-500"}`}/>{tesla.isOnline ? "Availability on" : "Availability off"}</span>}</div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="h-80 animate-pulse rounded-3xl bg-surface-muted"/><div className="h-80 animate-pulse rounded-3xl bg-surface-muted"/></div>
      ) : loadError ? (
        <div role="alert" className="mt-10 rounded-2xl border border-danger-600/30 bg-danger-50 px-5 py-4 text-sm text-danger-600">{loadError}</div>
      ) : tesla ? (
        <>
          <div className="mt-9 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <section className="noise relative overflow-hidden rounded-3xl bg-forest-900 p-6 text-white shadow-lift sm:p-8">
              <div className="route-grid absolute inset-0 opacity-10"/><div className="relative flex h-full min-h-72 flex-col justify-between"><div className="flex items-start justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-300 text-forest-950"><Car className="h-7 w-7"/></span><p className="font-meter text-[9px] uppercase tracking-[.18em] text-white/45">Vehicle ID · {tesla.id.slice(0, 8)}</p></div><div className="mt-12"><p className="font-meter text-[9px] uppercase tracking-[.18em] text-lime-300">Your Tesla</p><h2 className="mt-1 font-display text-6xl font-semibold uppercase leading-none">{tesla.label}</h2><div className="mt-6 max-w-sm"><p className="mb-2 text-xs text-white/50">Registered seat capacity</p><SeatPicker value={tesla.capacity} readOnly /></div></div></div>
            </section>
            <section className={`flex flex-col justify-between rounded-3xl border p-6 shadow-card sm:p-8 ${tesla.isOnline ? "border-lime-400 bg-lime-50" : "border-line bg-surface-raised"}`}><div><div className="flex items-center justify-between"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tesla.isOnline ? "bg-lime-300 text-forest-950" : "bg-surface-muted text-ink-500"}`}><MapPin className="h-5 w-5"/></span><span className="font-meter text-[9px] uppercase tracking-wider text-ink-500">Saved status</span></div><h2 className="mt-8 text-2xl font-semibold">{tesla.isOnline ? "Availability is on" : "Availability is off"}</h2><p className="mt-2 text-sm leading-relaxed text-ink-500">{tesla.isOnline ? "Your preference is saved. Rider discovery and requests are not part of this MVP yet." : "Turn this on to record that you're open to pooling when matching is introduced."}</p></div><div className="mt-8">{toggleError && <p role="alert" className="mb-3 rounded-xl bg-danger-50 p-3 text-xs text-danger-600">{toggleError}</p>}<button type="button" onClick={handleToggle} disabled={isToggling} className={`focus-ring w-full rounded-full px-6 py-3.5 text-sm font-semibold transition disabled:opacity-60 ${tesla.isOnline ? "border border-forest-900 bg-transparent text-forest-900 hover:bg-white" : "bg-forest-900 text-white hover:bg-forest-800"}`}>{isToggling ? "Updating..." : tesla.isOnline ? "Turn availability off" : "Turn availability on"}</button></div></section>
          </div>

          <section className="mt-8"><div><p className="font-meter text-[9px] uppercase tracking-[.18em] text-forest-700">MVP boundary</p><h2 className="mt-1 text-2xl font-semibold">What happens next</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-3">{[[Users,"01","Collect real route demand"],[Clock,"02","Introduce route matching"],[Shield,"03","Add trust and safety"]].map(([Icon,value,label])=>{const IconComponent=Icon as typeof Users; return <article key={label as string} className="rounded-2xl border border-line bg-surface-raised p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-forest-700"><IconComponent className="h-4 w-4"/></span><span className="font-display text-3xl font-semibold text-ink-500">{value as string}</span></div><p className="mt-5 text-sm text-ink-500">{label as string}</p></article>})}</div></section>
        </>
      ) : null}
    </main>
  );
}
