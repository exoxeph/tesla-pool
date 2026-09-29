// Mirrors apps/api/src/common/geo.ts and fare.ts exactly, so the form can
// show a live estimate as the user picks zones without a network round
// trip per keystroke. The server (apps/api) remains the source of truth —
// this only has to agree with it, never invent its own number.
const KM_PER_DEGREE = 111;
const BASE_FARE_PAISA = 3000;
const PER_KM_RATE_PAISA = 1500;

export interface LatLng {
  lat: number;
  lng: number;
}

export function equirectangularDistanceKm(a: LatLng, b: LatLng): number {
  const avgLatRadians = (((a.lat + b.lat) / 2) * Math.PI) / 180;
  const dxKm = (b.lng - a.lng) * Math.cos(avgLatRadians) * KM_PER_DEGREE;
  const dyKm = (b.lat - a.lat) * KM_PER_DEGREE;
  return Math.sqrt(dxKm * dxKm + dyKm * dyKm);
}

export function estimateFarePaisa(distanceKm: number): number {
  return BASE_FARE_PAISA + Math.round(distanceKm * PER_KM_RATE_PAISA);
}

export function formatPaisa(paisa: number): string {
  return `৳${(paisa / 100).toFixed(2)}`;
}
