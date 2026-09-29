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

// Pool discount: 15% off a passenger's own base+distance fare, applied
// only when they're actually joining an existing pool that already has
// another active passenger in it — not for founding a solo pool, since
// there's no one to share the ride (or the savings) with yet. See
// docs/fare-model.md for the worked example and the "why not split a
// pool total" reasoning.
export const POOL_DISCOUNT_RATE = 0.15;

export function calculatePerPassengerFarePaisa(
  distanceKm: number,
  seats: number,
  isJoiningExistingPool: boolean
): number {
  const baseFarePaisa = estimateFarePaisa(distanceKm) * seats;
  if (!isJoiningExistingPool) {
    return baseFarePaisa;
  }
  return Math.round(baseFarePaisa * (1 - POOL_DISCOUNT_RATE));
}
