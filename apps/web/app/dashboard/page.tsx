"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-client";
import { RideRequestForm } from "@/components/ride-request-form";
import { MyRides } from "@/components/my-rides";
import { Users } from "@/components/icons";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login?role=passenger");
      return;
    }
    setIsAuthed(true);
  }, [router]);

  if (!isAuthed) return null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-meter text-[9px] uppercase tracking-[.2em] text-forest-700">Passenger dashboard</p>
          <h1 className="mt-2 font-display text-5xl font-semibold uppercase leading-none text-ink-950 sm:text-6xl">
            Where to today?
          </h1>
          <p className="mt-3 max-w-xl text-ink-500">
            Request a shared ride between two Dhaka zones and track it below.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-4 py-3 shadow-sm">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-mango-400 text-sm font-semibold">YP</span>
          <div>
            <p className="text-sm font-semibold">Your account</p>
            <p className="font-meter text-[8px] uppercase tracking-wider text-ink-500">Passenger</p>
          </div>
        </div>
      </div>

      <div className="mt-9">
        <RideRequestForm onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>

      <MyRides refreshKey={refreshKey} />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface-raised p-6 shadow-card sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-forest-700">
            <Users className="h-5 w-5" />
          </span>
          <p className="mt-8 font-meter text-[9px] uppercase tracking-[.18em] text-forest-700">No invented matches</p>
          <h2 className="mt-2 text-2xl font-semibold">Pools are real — you just can&apos;t see them here yet.</h2>
          <p className="mt-3 leading-relaxed text-ink-500">
            When a driver accepts a compatible passenger's request into the same trip as yours, you
            both get a lower fare automatically. This page doesn't visually show who you're sharing
            with yet — that display is the next milestone, not the matching itself.
          </p>
        </section>
        <section className="rounded-3xl bg-mango-100 p-6 sm:p-8">
          <span className="font-meter text-[9px] uppercase tracking-[.18em] text-forest-700">What works today</span>
          <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-[.9]">
            Request a ride.
            <br />
            Track it live.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-700">
            Ride requests, fare estimates, driver acceptance, trip progress, and real multi-passenger
            pooling (with an automatic discount when you share a trip) are all real and saved.
          </p>
        </section>
      </div>
    </main>
  );
}
