# Geography and matching

This document explains how Dhaka Tesla Pool decides whether two passengers
can share a ride, and why the geometry behind it is intentionally simple.

## The matching rule

Two ride requests are compatible — meaning they *could* share a Pool —
when both of these hold:

- **Pickup-to-pickup distance ≤ 1.5 km**
- **Destination-to-destination distance ≤ 3 km**

The two thresholds are different on purpose. A shared pickup matters more
for actually meeting up (someone has to physically walk to the car), so it
gets the tighter radius. A shared destination only has to be "close
enough to be a sensible shared drop-off" — the vehicle is already moving
and a slightly longer detour at the end costs less than making two
strangers walk 3 km to a common pickup point.

Implemented in [`apps/api/src/common/geo.ts`](../apps/api/src/common/geo.ts)
as named constants, not magic numbers:

```ts
export const PICKUP_THRESHOLD_KM = 1.5;
export const DESTINATION_THRESHOLD_KM = 3;
```

## The distance formula

Distance between two lat/lng points is computed with an **equirectangular
approximation** — plain Euclidean distance on lat/lng, after correcting
longitude by `cos(average latitude)` to account for longitude lines
converging toward the poles:

```
dx_km = (lng2 - lng1) * cos(avgLatRadians) * 111
dy_km = (lat2 - lat1) * 111
distance_km = sqrt(dx_km^2 + dy_km^2)
```

`111` is the approximate number of kilometers per degree of latitude
(and, after the cosine correction, per degree of longitude at that
latitude too).

### Worked example: Nusrat and Rafiq's actual trips

From the seed data, Nusrat and Rafiq both start at **Banani** and head to
**Mohakhali** and **Gulshan 1** respectively.

**Pickup distance** (Banani → Banani): both requests share the same
pickup zone, so this is `0 km` — trivially under the 1.5 km threshold.

**Destination distance** (Mohakhali → Gulshan 1), computed by hand:

| Step | Value |
|---|---|
| Mohakhali | lat `23.777628`, lng `90.405449` |
| Gulshan 1 | lat `23.797911`, lng `90.414391` |
| Average latitude | `(23.777628 + 23.797911) / 2 = 23.787770°` |
| Average latitude in radians | `23.787770 * π / 180 = 0.415175` |
| `cos(avgLatRadians)` | `0.915046` |
| `dLng` | `90.414391 - 90.405449 = 0.008942°` |
| `dLat` | `23.797911 - 23.777628 = 0.020283°` |
| `dx_km` | `0.008942 * 0.915046 * 111 = 0.9082 km` |
| `dy_km` | `0.020283 * 111 = 2.2514 km` |
| `distance_km` | `sqrt(0.9082² + 2.2514²) = 2.4277 km` |

**Result:** pickup distance `0 km ≤ 1.5 km` and destination distance
`2.43 km ≤ 3 km` — **both thresholds pass, so Nusrat and Rafiq are
compatible.**

Worth being precise about what this originally confirmed, on the branch
that introduced `zonesAreCompatible()`: the seed data already had Nusrat
and Rafiq assigned to the same `Pool`, but that assignment was
hand-authored directly in the seed script before any matching logic
existed — `zonesAreCompatible()` was never called to produce it. That
calculation only demonstrated that the rule, run independently against
their real coordinates, *agreed with* the pre-existing grouping.

**Update (`feature/tesla-pooling`):** the rule is now actually wired into
pool assignment. `findCompatibleOpenPool` (in
[`apps/api/src/modules/rides/pool-matching.ts`](../apps/api/src/modules/rides/pool-matching.ts))
calls `zonesAreCompatible()` for real every time a driver accepts a
request, comparing it against a candidate pool's anchor. Verified live
against fresh (non-seed) requests: a driver accepting Nusrat's
Banani → Mohakhali request founds a pool; accepting Rafiq's
Banani → Gulshan 1 request afterward joins that same pool, matching the
hand-computed compatibility above exactly. See
[`fare-model.md`](./fare-model.md) for the resulting per-passenger fares.

For contrast, a pickup at Banani vs. a pickup at Farmgate is `4.55 km`
apart — over the 1.5 km pickup threshold on its own, so that pair is
rejected regardless of how close their destinations are. Both numbers are
asserted directly in
[`apps/api/src/common/geo.test.ts`](../apps/api/src/common/geo.test.ts).

## Why equirectangular instead of Haversine

Haversine accounts for the Earth's curvature, which matters over long
distances (hundreds to thousands of km). Dhaka Tesla Pool only ever
compares points a few kilometers apart, within a single city. At that
scale the curvature correction changes the result by a negligible
fraction of a percent — not enough to ever flip a compatibility decision
near the threshold — while adding trigonometric complexity (`atan2`,
`sin²`, haversine of half-angle differences) for no practical benefit.
Equirectangular gives the same answer, in a formula anyone reviewing the
code can verify by hand in a spreadsheet.

## Why not BFS/DFS/A* pathfinding

Graph search algorithms (BFS, DFS, A*) solve a different problem:
*shortest path through a network* — the kind of thing you need when
routing a car through actual streets, one-way restrictions, and traffic.
That's not the problem here. Zone compatibility is asking "how far apart,
as the crow flies, are two points?" — a pure distance measurement, not a
route. Reaching for graph search would mean building and maintaining a
road-network graph of Dhaka (nodes, edges, turn restrictions, live
traffic weights) just to answer a question that straight-line distance
already answers correctly for the purpose of "is this passenger close
enough to pool with that one." That is exactly the routing-API rebuild
this assessment's scope says to avoid.

## Driver location: not modeled

Drivers have no `lat`/`lng` in this schema, and matching never considers
driver position. **This is a deliberate simplification, not an
oversight.** The only geo problem being solved in this branch is
passenger-to-passenger matching — "should these two ride requests share a
pool." Where the driver's vehicle currently is, and how a driver chooses
which open pool to serve, is a separate concern: a driver simply sees
open pools system-wide and picks one. That flow is built in a later
branch (the driver-facing pooling flow), not this one.

## The "pool anchor" design

A Pool is founded by whichever ride request creates it first — call that
the **anchor**. The anchor's pickup zone and destination zone are fixed
for the lifetime of the pool. Every later passenger who wants to join is
checked against that same fixed anchor, never against a shifting average
of the pool's current members.

Concretely, in the seed data: Nusrat's request founds the pool (anchor =
Banani → Mohakhali). Rafiq is checked against Nusrat's anchor and passes.
If a third passenger like Shirin wanted to join the same pool, she would
also be checked against Nusrat's original anchor — not against "the
average of Nusrat and Rafiq's zones," and not against Rafiq's zones
specifically. (In the actual seed data Shirin has a different, unrelated
route and is not part of this pool — she's used here only to illustrate
how a third joiner *would* be evaluated.)

This keeps matching **deterministic and order-independent to reason
about**: whether a candidate passenger is compatible with a pool depends
only on the pool's anchor, never on which other members happened to join
in between, and never on the order they joined in.
