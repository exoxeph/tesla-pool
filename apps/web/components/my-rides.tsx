"use client";

import { useEffect, useState } from "react";
import { authedFetch, fetchZones, type Zone } from "@/lib/auth-client";
import { formatPaisa } from "@/lib/fare-estimate";
import { Clock, Users } from "@/components/icons";

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

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "bg-lime-300 text-forest-950",
  MATCHED: "bg-mango-400 text-forest-950",
  DRIVER_ARRIVED: "bg-mango-400 text-forest-950",
  STARTED: "bg-mango-400 text-forest-950",
  COMPLETED: "bg-surface-muted text-ink-500",
  CANCELLED: "bg-surface-muted text-ink-500 line-through decoration-1",
};

function zoneName(zones: Zone[], id: string) {
  return zones.find((z) => z.id === id)?.name ?? id;
}

export function MyRides({ refreshKey }: { refreshKey: number }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [requests, setRequests] = useState<RideRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      fetchZones(),
      authedFetch<{ requests: RideRequest[] }>("/rides/mine"),
    ])
      .then(([zonesData, ridesData]) => {
        setZones(zonesData);
        setRequests(ridesData.requests);
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
        )
      )
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  async function handleCancel(id: string) {
    setCancelError(null);
    setCancellingId(id);
    try {
      const data = await authedFetch<{ request: RideRequest }>(`/rides/${id}/cancel`, {
        method: "PATCH",
      });
      setRequests((prev) =>
        prev ? prev.map((r) => (r.id === id ? data.request : r)) : prev
      );
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Couldn't cancel this ride. Try again."
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="mt-8">
      <div>
        <p className="font-meter text-[9px] uppercase tracking-[.18em] text-forest-700">Your requests</p>
        <h2 className="mt-1 text-2xl font-semibold">Ride history</h2>
      </div>

      {isLoading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      ) : loadError ? (
        <p role="alert" className="mt-5 rounded-2xl border border-danger-600/30 bg-danger-50 px-5 py-4 text-sm text-danger-600">
          {loadError}
        </p>
      ) : requests && requests.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-line bg-surface-raised p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-forest-700">
            <Users className="h-5 w-5" />
          </span>
          <p className="mt-4 font-semibold text-ink-900">No ride requests yet.</p>
          <p className="mt-1 text-sm text-ink-500">
            Request a ride above and it will show up here.
          </p>
        </div>
      ) : requests ? (
        <>
          {cancelError ? (
            <p role="alert" className="mt-5 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">
              {cancelError}
            </p>
          ) : null}
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-900">
                    {zoneName(zones, r.pickupZoneId)} &rarr; {zoneName(zones, r.destinationZoneId)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-meter text-[8px] font-semibold uppercase tracking-wider ${STATUS_STYLE[r.status] ?? "bg-surface-muted text-ink-500"}`}
                  >
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
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  {r.status === "REQUESTED" ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(r.id)}
                      disabled={cancellingId === r.id}
                      className="focus-ring rounded-full border border-danger-600/40 px-3 py-1.5 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancellingId === r.id ? "Cancelling..." : "Cancel"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
