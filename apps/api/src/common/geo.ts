// Equirectangular approximation, not Haversine. At Dhaka's city scale (a
// few km across), Haversine's curvature correction adds complexity for no
// accuracy benefit — see docs/geography-and-matching.md for the full
// reasoning.
const KM_PER_DEGREE = 111;

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

// Two ride requests are compatible if their pickups are close enough to
// actually meet up, AND their destinations are close enough to be a
// sensible shared drop-off. Different thresholds deliberately: shared
// pickup matters more for actually meeting up than shared drop-off does.
export const PICKUP_THRESHOLD_KM = 1.5;
export const DESTINATION_THRESHOLD_KM = 3;

export function zonesAreCompatible(
  pickupA: LatLng,
  destA: LatLng,
  pickupB: LatLng,
  destB: LatLng
): boolean {
  const pickupDistanceKm = equirectangularDistanceKm(pickupA, pickupB);
  const destinationDistanceKm = equirectangularDistanceKm(destA, destB);

  return (
    pickupDistanceKm <= PICKUP_THRESHOLD_KM &&
    destinationDistanceKm <= DESTINATION_THRESHOLD_KM
  );
}
