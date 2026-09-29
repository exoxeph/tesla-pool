# Fare Model

Money is always stored and computed as **integer paisa**, never
float/decimal — 1 BDT = 100 paisa. Floating-point arithmetic on money
accumulates rounding error across enough operations, and paisa is the
smallest real unit anyway, so there's no fractional-paisa case to
represent. This was the person's own decision (see `docs/ai-usage-notes.md`),
made specifically to avoid rounding drift.

## The formula

```
perPassengerFarePaisa = (BASE_FARE_PAISA + round(distanceKm * PER_KM_RATE_PAISA)) * seats
                          * (1 - POOL_DISCOUNT_RATE)   [only if joining an existing pool]
```

Constants, in [`apps/api/src/common/fare.ts`](../apps/api/src/common/fare.ts):

```ts
export const BASE_FARE_PAISA = 3000;       // ৳30.00 flat
export const PER_KM_RATE_PAISA = 1500;     // ৳15.00 per km
export const POOL_DISCOUNT_RATE = 0.15;    // 15% off, joiners only
```

`distanceKm` is **that passenger's own** pickup-to-destination distance
(equirectangular, same formula used for matching — see
[`geography-and-matching.md`](./geography-and-matching.md)), never a
shared/split total. Each passenger in a pool can be going a different
distance, so each pays for their own trip.

## Why per-passenger, not a split pool total

A naive "split the pool's total fare N ways" model breaks down the
moment two passengers in the same pool are going different distances —
either the shorter trip subsidizes the longer one, or you need a
distance-proportional split formula that's harder to explain and audit
than just "you pay for your own distance, minus a flat discount for
sharing the ride." Per-passenger calculation is what the schema already
supports (`RideRequest.farePaisa` is per-request, not per-pool), so this
follows the existing data model rather than fighting it.

## The pool discount: 15%, joiners only

A passenger gets `POOL_DISCOUNT_RATE` (15%) off their own base+distance
fare **only if** they're joining an existing pool that already has
another active passenger in it. A passenger who **founds** a pool (the
first, or the "anchor" — see the pool-anchor design in
`geography-and-matching.md`) pays full fare, because at the moment they're
accepted there's no one else in the pool yet to share the ride — or the
savings — with.

This means fare is finalized **at accept time**, not at request-creation
time: only once a driver actually accepts a request does the system know
whether that passenger is founding a pool or joining one.
`createRideRequest` still computes and stores a farePaisa immediately
(the "estimated fare" shown on the request form), but `acceptRideRequest`
recalculates and overwrites it with the final, discount-aware amount once
matching happens.

**Known asymmetry, worth stating plainly:** the anchor passenger pays
full price even after a second passenger joins their pool and starts
saving. Their fare is never retroactively discounted. This is a
deliberate MVP simplification, not an oversight — recomputing every
current pool member's fare every time someone new joins adds real
complexity (all previously-quoted amounts become moving targets) for a
model that's supposed to be simple enough to hand-verify. At a larger
scale this is one of the first things worth revisiting (see "At scale"
below).

## Worked example: Nusrat and Rafiq

Same real seed coordinates used in `geography-and-matching.md`'s
compatibility example.

**Nusrat** requests Banani → Mohakhali, 1 seat, and is the first passenger
a driver accepts — she founds the pool.

| Step | Value |
|---|---|
| distanceKm (Banani → Mohakhali) | `1.8204` km (from `geography-and-matching.md`) |
| Base fare | `3000 + round(1.8204 * 1500) = 3000 + 2731 = 5731` |
| Seats | `× 1 = 5731` |
| Pool discount | none — founding, not joining |
| **Nusrat's final fare** | **`5731` paisa (৳57.31)** |

**Rafiq** requests Banani → Gulshan 1, 1 seat. When his request is
accepted, the driver already has Nusrat's pool open and compatible
(same pickup, destination `2.4277` km apart — within the `3` km
threshold) — Rafiq joins it.

| Step | Value |
|---|---|
| distanceKm (Banani → Gulshan 1) | `1.1160` km |
| Base fare | `3000 + round(1.1160 * 1500) = 3000 + 1674 = 4674` |
| Seats | `× 1 = 4674` |
| Pool discount | `× (1 - 0.15) = × 0.85` |
| Discounted | `round(4674 * 0.85) = round(3972.9) = 3973` |
| **Rafiq's final fare** | **`3973` paisa (৳39.73)** |

Both figures are asserted directly in
[`apps/api/src/modules/rides/rides.test.ts`](../apps/api/src/modules/rides/rides.test.ts)
("matches hand-computed fares for a founding passenger and a joining
passenger"), and were also verified live against real seeded data during
this branch's manual walkthrough.

## At scale — what this model doesn't handle yet

- **No fare rebalancing.** As noted above, the anchor never gets
  discounted retroactively. At scale, recomputing every active member's
  fare on each join (and communicating the change to already-quoted
  passengers) becomes necessary for fairness, but needs a clear "the
  quoted fare can still move until the trip starts" contract with users.
- **Flat discount rate, no distance/overlap sensitivity.** Two passengers
  whose routes overlap almost entirely get the same 15% as two who barely
  qualify under the matching thresholds. A more mature model would scale
  the discount with actual route overlap (e.g., shared distance ÷ total
  distance), which needs a real route (not just straight-line distance)
  to compute meaningfully — see the "why not routing" discussion in
  `geography-and-matching.md`.
- **No surge/demand pricing.** Explicitly out of scope for this MVP.
