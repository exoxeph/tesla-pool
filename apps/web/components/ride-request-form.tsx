"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch, fetchZones, type Zone } from "@/lib/auth-client";
import {
  equirectangularDistanceKm,
  estimateFarePaisa,
  formatPaisa,
} from "@/lib/fare-estimate";
import { SeatPicker } from "@/components/seat-picker";
import { ArrowRight, MapPin } from "@/components/icons";

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

export function RideRequestForm({ onCreated }: { onCreated: () => void }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [isLoadingZones, setIsLoadingZones] = useState(true);

  const [pickupZoneId, setPickupZoneId] = useState("");
  const [destinationZoneId, setDestinationZoneId] = useState("");
  const [seats, setSeats] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchZones()
      .then(setZones)
      .catch((err) =>
        setZonesError(err instanceof Error ? err.message : "Couldn't load zones.")
      )
      .finally(() => setIsLoadingZones(false));
  }, []);

  const isSameZone =
    pickupZoneId !== "" && pickupZoneId === destinationZoneId;

  const estimatedFarePaisa = useMemo(() => {
    if (isSameZone) return null;
    const pickup = zones.find((z) => z.id === pickupZoneId);
    const destination = zones.find((z) => z.id === destinationZoneId);
    if (!pickup || !destination) return null;

    const distanceKm = equirectangularDistanceKm(pickup, destination);
    // Mirrors the backend: fare scales with seats, not a flat per-request charge.
    return estimateFarePaisa(distanceKm) * seats;
  }, [zones, pickupZoneId, destinationZoneId, isSameZone, seats]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!pickupZoneId || !destinationZoneId) {
      setFormError("Choose a pickup and a destination zone.");
      return;
    }
    if (pickupZoneId === destinationZoneId) {
      setFormError("Pickup and destination must be different zones.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authedFetch<{ request: RideRequest }>("/rides/request", {
        method: "POST",
        body: { pickupZoneId, destinationZoneId, seats },
      });
      setPickupZoneId("");
      setDestinationZoneId("");
      setSeats(1);
      onCreated();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="noise relative overflow-hidden rounded-3xl bg-forest-900 p-6 text-white shadow-lift sm:p-8">
      <div className="route-grid absolute inset-0 opacity-10" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 font-meter text-[9px] uppercase tracking-wider text-white/65">
          <MapPin className="h-3.5 w-3.5 text-lime-300" />
          Request a shared ride
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold uppercase leading-[.92] sm:text-5xl">
          Where are you headed?
        </h2>

        {isLoadingZones ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/[0.06]" />
        ) : zonesError ? (
          <p role="alert" className="mt-6 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">
            {zonesError}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            {formError ? (
              <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">
                {formError}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="rounded-2xl bg-white p-4 text-ink-900">
                <span className="flex items-center gap-2 text-xs font-medium text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-lime-400 ring-4 ring-lime-400/20" />
                  Pickup
                </span>
                <select
                  aria-label="Pickup zone"
                  value={pickupZoneId}
                  onChange={(e) => setPickupZoneId(e.target.value)}
                  className="mt-2 w-full bg-transparent text-base font-medium outline-none"
                >
                  <option value="">Choose a zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="rounded-2xl bg-white p-4 text-ink-900">
                <span className="flex items-center gap-2 text-xs font-medium text-ink-500">
                  <MapPin className="h-3.5 w-3.5 text-mango-500" />
                  Destination
                </span>
                <select
                  aria-label="Destination zone"
                  value={destinationZoneId}
                  onChange={(e) => setDestinationZoneId(e.target.value)}
                  className="mt-2 w-full bg-transparent text-base font-medium outline-none"
                >
                  <option value="">Choose a zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-white/55">Seats needed</p>
              <SeatPicker value={seats} onChange={setSeats} />
            </div>

            {isSameZone ? (
              <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">
                Pickup and destination must be different zones.
              </p>
            ) : null}

            <div className="mt-2 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Estimated fare</p>
                <p className="font-display text-4xl font-semibold leading-none">
                  {estimatedFarePaisa === null ? "—" : formatPaisa(estimatedFarePaisa)}
                </p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || isSameZone}
                className="focus-ring inline-flex items-center justify-center gap-3 rounded-full bg-lime-300 px-6 py-4 font-semibold text-forest-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Requesting..." : <>Request this ride <ArrowRight className="h-5 w-5" /></>}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
