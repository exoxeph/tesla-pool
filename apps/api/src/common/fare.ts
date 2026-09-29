// Fare estimation. Money stored and computed as integer paisa throughout,
// never floats — same reasoning as the geography work: floating-point
// arithmetic on money accumulates rounding error across enough
// operations, and paisa (BDT / 100) is the smallest real unit anyway, so
// there is no fractional-paisa case to represent.
export const BASE_FARE_PAISA = 3000;
export const PER_KM_RATE_PAISA = 1500;

export function estimateFarePaisa(distanceKm: number): number {
  return BASE_FARE_PAISA + Math.round(distanceKm * PER_KM_RATE_PAISA);
}
