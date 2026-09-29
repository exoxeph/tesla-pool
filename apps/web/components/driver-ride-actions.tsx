"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, fetchZones, type Zone } from "@/lib/auth-client";
import { formatPaisa } from "@/lib/fare-estimate";
import { MapPin, Users } from "@/components/icons";

type RideRequest = {
  id: string;
  pickupZoneId: string;
  destinationZoneId: string;
  seats: number;
  status: string;
  farePaisa: number | null;
  poolId: string | null;
  createdAt: string;
};

// Only the action that's actually valid next shows — never "complete"
// before "start" was pressed, matching the backend's transition table.
const NEXT_ACTION: Record<string, { label: string; path: string } | undefined> = {
  MATCHED: { label: "Mark arrived", path: "driver-arrived" },
  DRIVER_ARRIVED: { label: "Start trip", path: "start" },
  STARTED: { label: "Complete trip", path: "complete" },
};

function zoneName(zones: Zone[], id: string) {
  return zones.find((z) => z.id === id)?.name ?? id;
}

export function DriverRideActions() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [available, setAvailable] = useState<RideRequest[] | null>(null);
  const [mine, setMine] = useState<RideRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      fetchZones(),
      authedFetch<{ requests: RideRequest[] }>("/rides/available"),
      authedFetch<{ requests: RideRequest[] }>("/rides/driver-mine"),
    ])
      .then(([zonesData, availableData, mineData]) => {
        setZones(zonesData);
        setAvailable(availableData.requests);
        setMine(
          mineData.requests.filter(
            (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED"
          )
        );
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(id: string) {
    setActionError(null);
    setPendingId(id);
    try {
      await authedFetch(`/rides/${id}/accept`, { method: "POST" });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't accept this ride. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleAdvance(id: string, path: string) {
    setActionError(null);
    setPendingId(id);
    try {
      await authedFetch(`/rides/${id}/${path}`, { method: "PATCH" });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update this ride. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (isLoading) {
    return (
      <section className="mt-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <p role="alert" className="mt-8 rounded-2xl border border-danger-600/30 bg-danger-50 px-5 py-4 text-sm text-danger-600">
        {loadError}
      </p>
    );
  }

  return (
    <section className="mt-8">
      {actionError ? (
        <p role="alert" className="mb-4 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {actionError}
        </p>
      ) : null}

      <div>
        <p className="font-meter text-[9px] uppercase tracking-[.18em] text-forest-700">Nearby requests</p>
        <h2 className="mt-1 text-2xl font-semibold">Riders waiting</h2>
      </div>
      {available && available.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-line bg-surface-raised p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-forest-700">
            <Users className="h-5 w-5" />
          </span>
          <p className="mt-4 font-semibold text-ink-900">No pending requests right now.</p>
          <p className="mt-1 text-sm text-ink-500">New ride requests will show up here as they come in.</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {available?.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card">
              <p className="text-sm font-semibold text-ink-900">
                {zoneName(zones, r.pickupZoneId)} &rarr; {zoneName(zones, r.destinationZoneId)}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {r.seats} seat{r.seats === 1 ? "" : "s"}
                </span>
                <span className="font-display text-xl font-semibold leading-none text-ink-950">
                  {r.farePaisa === null ? "—" : formatPaisa(r.farePaisa)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAccept(r.id)}
                disabled={pendingId === r.id}
                className="focus-ring mt-4 w-full rounded-full bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingId === r.id ? "Accepting..." : "Accept ride"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <p className="font-meter text-[9px] uppercase tracking-[.18em] text-forest-700">Your trips</p>
        <h2 className="mt-1 text-2xl font-semibold">In progress</h2>
      </div>
      {mine && mine.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-line bg-surface-raised p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-forest-700">
            <MapPin className="h-5 w-5" />
          </span>
          <p className="mt-4 font-semibold text-ink-900">No accepted trips yet.</p>
          <p className="mt-1 text-sm text-ink-500">Accept a request above to start one.</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {mine?.map((r) => {
            const next = NEXT_ACTION[r.status];
            return (
              <li key={r.id} className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-900">
                    {zoneName(zones, r.pickupZoneId)} &rarr; {zoneName(zones, r.destinationZoneId)}
                  </p>
                  <span className="shrink-0 rounded-full bg-mango-400 px-2.5 py-1 font-meter text-[8px] font-semibold uppercase tracking-wider text-forest-950">
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {r.seats} seat{r.seats === 1 ? "" : "s"}
                  </span>
                  <span className="font-display text-xl font-semibold leading-none text-ink-950">
                    {r.farePaisa === null ? "—" : formatPaisa(r.farePaisa)}
                  </span>
                </div>
                {next ? (
                  <button
                    type="button"
                    onClick={() => handleAdvance(r.id, next.path)}
                    disabled={pendingId === r.id}
                    className="focus-ring mt-4 w-full rounded-full bg-lime-300 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingId === r.id ? "Updating..." : next.label}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
