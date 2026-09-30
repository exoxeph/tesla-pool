# Dhaka Tesla Pool

Ride-pooling MVP for shared Tesla rides across Dhaka. Built as a technical
assessment submission.

## Summary

> TODO — one-paragraph pitch once core flows (passenger request, driver
> matching, pool lifecycle) are implemented.

## Problem statement

> TODO — describe the ride-pooling problem this MVP solves and why it's
> scoped to a small fleet of Teslas in Dhaka.

## Features implemented

> TODO — full checklist, updated as feature branches merge.

- Passenger and driver auth (signup/login, JWT)
- Driver vehicle registration + online/offline status
- Ride requests with a live fare estimate
- Full ride lifecycle: `REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED →
  COMPLETED`/`CANCELLED`, with concurrency-safe conditional writes
- **Real multi-passenger pooling**: accepting a request joins a compatible
  existing pool when one exists (route-matched, capacity-checked,
  race-safe) or founds a new one — see "Matching, fare, and concurrency"
  below
- Driver-facing pool view (`GET /rides/pools/mine`): full passenger list
  per pool, not just one ride at a time
- Driver-flow: online/offline actually gates new-request matching (not
  just a stored flag), a single-pool detail view, and driver ride/pool
  history — see "Driver-flow decisions" below
- Status audit log: every attempted status transition, including the
  losing side of a concurrency conflict, readable back per-ride and
  per-pool — see "Status audit log" below

## Screenshots / GIFs

> TODO — add once the passenger/driver UI exists.

## Architecture diagram + ERD

See [`docs/architecture.md`](docs/architecture.md) and
[`docs/erd.md`](docs/erd.md).

## Tech stack & justification

| Layer      | Choice                          | Why |
|------------|----------------------------------|-----|
| Frontend   | Next.js (App Router) + TypeScript | Modern React with file-based routing and built-in API-friendly conventions. |
| Backend    | Node.js + Express + TypeScript   | Minimal, explicit control over routing/middleware for a small REST surface. |
| ORM        | Prisma                          | Type-safe queries + migrations against Postgres. |
| Database   | PostgreSQL                      | Relational integrity for users/pools/requests; strong Prisma support. |
| Validation | zod                              | Runtime validation + static types from one schema. |
| Auth       | JWT (jsonwebtoken + bcryptjs)     | Stateless auth suitable for a small API, simple to reason about for an assessment. |
| Testing    | Jest + supertest (backend)       | Standard, fast HTTP-level testing for Express routes. |

> TODO — expand trade-off reasoning as decisions are made (see "Key
> decisions/trade-offs" below).

## Project structure

```
apps/
  api/            Express + TypeScript API
    src/
      config/     env parsing/validation
      db/         Prisma client
      common/     shared middleware/errors
      modules/    feature modules (routers, services, tests)
    prisma/       schema + seed
  web/            Next.js (App Router) frontend
    app/
docs/             architecture, ERD, fare model notes
docker-compose.yml
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose (for the full stack)

## Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```
cp .env.example .env
```

See [`.env.example`](.env.example) for the full list (Postgres credentials,
`DATABASE_URL`, `JWT_SECRET`, `PORT`, `NEXT_PUBLIC_API_URL`).

## Local setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev:api    # in one terminal
npm run dev:web    # in another terminal
```

## Docker instructions

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres (with a healthcheck), the API, and the web app, wired
together via `.env`. Web: http://localhost:3000, API: http://localhost:4000.

> TODO — document running Prisma migrate/seed against the dockerized
> Postgres from the host once that workflow is finalized.

## Migration/seed instructions

```bash
npm run prisma:migrate   # apply schema to the database
npm run prisma:seed      # load demo data (Jashim + Bullet + 3 passengers)
```

## Running tests

```bash
npm run test:api
```

## Demo credentials

All seeded users share the same demo password: `password123`

| Name   | Role      | Phone         |
|--------|-----------|---------------|
| Jashim | DRIVER    | 01700000001   |
| Nusrat | PASSENGER | 01700000002   |
| Rafiq  | PASSENGER | 01700000003   |
| Shirin | PASSENGER | 01700000004   |

## Deployment URL

> TODO — add once deployed.

## API overview

> TODO — full request/response docs. Ride and pooling endpoints so far:

| Method & path | Role | What it does |
|---|---|---|
| `POST /rides/request` | Passenger | Create a ride request; returns an *estimated* fare |
| `GET /rides/mine` | Passenger | This passenger's own requests, with live status |
| `PATCH /rides/:id/cancel` | Passenger | Cancel (allowed from `REQUESTED`/`MATCHED`/`DRIVER_ARRIVED`) |
| `GET /rides/available` | Driver | "Relevant requests" — pending (`REQUESTED`) requests, system-wide; empty if this driver is offline |
| `POST /rides/:id/accept` | Driver | Accept a request — joins a compatible open pool on this driver's own tesla, or founds a new one; finalizes `farePaisa`; rejected (409) if this driver is offline |
| `PATCH /rides/:id/driver-arrived` | Driver | `MATCHED → DRIVER_ARRIVED` |
| `PATCH /rides/:id/start` | Driver | `DRIVER_ARRIVED → STARTED`; locks the pool |
| `PATCH /rides/:id/complete` | Driver | `STARTED → COMPLETED` |
| `GET /rides/driver-mine` | Driver | This driver's own requests, flat list |
| `GET /rides/pools/mine` | Driver | This driver's own pools, each with its **full passenger list** (pickup/destination/status/fare per passenger) |
| `GET /rides/pools/:id` | Driver | Single-pool detail with full passenger list; 403/404 if it isn't this driver's pool |
| `GET /rides/pools/history` | Driver | This driver's completed (and, if ever reached, cancelled) pools, most recent first |
| `PATCH /drivers/me/status` | Driver | Set `isOnline` — see "Driver-flow decisions" below for what this actually gates |
| `GET /rides/:id/history` | Passenger (owner) | Every attempted status transition for one ride, oldest first — see "Status audit log" below |
| `GET /rides/pools/:id/history` | Driver (owner) | Every attempted status transition across every request that has belonged to this pool, oldest first |

## Ride lifecycle

```
REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED
```

`CANCELLED` is reachable from `REQUESTED`, `MATCHED`, or `DRIVER_ARRIVED` —
**not** from `STARTED`. A trip that's already moving isn't a "never
happened" cancellation anymore; once a driver has pressed Start, the only
way forward is Complete. This is enforced in one place,
[`isValidTransition`](apps/api/src/common/rideLifecycle.ts), and every
endpoint that changes a `RideRequest`'s status goes through it rather than
hand-rolling its own check — including `PATCH /rides/:id/cancel`, which
additionally verifies the caller is the request's own passenger (403
otherwise) before checking whether the current state is one of the three
cancellable ones.

**Why `GET /rides/mine` returns a passenger's full history in one list**,
rather than a separate history endpoint the way the driver side has
(`GET /rides/pools/history`): this is a deliberate simplification, not an
oversight. A driver accumulates many pools over an open-ended career, so
splitting "active" from "history" keeps that list usable. A passenger's
own request list is naturally small — a handful of rides at most for this
MVP — so one chronological list (most recent first, active and completed
and cancelled together) is simpler for a passenger to scan than two tabs
would be, with nothing lost. If passenger ride volume ever grew large
enough that this stopped being true, splitting it would be the same
change already made for drivers, not a new pattern to invent.

### Status audit log

Every attempted status transition — accept, cancel, driver-arrived, start,
complete — is recorded as a `RideStatusEvent` row: `fromStatus`,
`toStatus`, who did it (`actorUserId`/`actorRole`), and an `outcome` of
`SUCCESS` or `CONFLICT`. "Attempted" is the operative word: a losing side
of a concurrency conflict (e.g. the second of two drivers racing to accept
the same request, or the second of two passengers racing for the last
seat in a pool) is logged too, with `outcome: CONFLICT` — not just the
write that actually won. That's what makes this useful as a concurrency
audit trail, not just a status-change log.

The two outcomes are written differently, and that difference is
deliberate rather than an inconsistency:

- A `SUCCESS` row is inserted **inside the same transaction** as the write
  it describes (the same `$transaction` that flips the request's status
  and, where relevant, claims a pool seat or locks the pool). If any part
  of that transaction fails, the event never lands either — it can never
  describe a write that didn't actually happen.
- A `CONFLICT` row **cannot** live inside that transaction, by definition:
  the transaction that hit the conflict rolled back, so nothing written
  inside it — an event row included — could have survived. It's written
  as a separate, immediate insert right after the conflict is detected,
  in a `catch` block outside the aborted transaction.

Two read endpoints expose the log: `GET /rides/:id/history` (a passenger
reading their own ride's timeline; 403 for anyone else's) and
`GET /rides/pools/:id/history` (a driver reading every event across every
request that's ever belonged to one of their pools; 403 for another
driver's pool). Both use the same ownership pattern as the existing
`PATCH /rides/:id/cancel` and `GET /rides/pools/:id` endpoints.

One scoping note: the log only records races caught by the app's own
conditional writes (`updateMany` returning `count === 0`) — not every
early-rejection 409, like calling `/start` on a request that's still
`REQUESTED`. That kind of rejection is a caller mistake against
already-known state, not a race against a concurrent write, and nothing
actually happened to the resource for an event to describe.

## Matching, fare, and concurrency (pooling)

Full detail lives in dedicated docs — this is the map:

- **Matching rule**: [`docs/geography-and-matching.md`](docs/geography-and-matching.md).
  Two ride requests are compatible when pickup-to-pickup distance is
  ≤ 1.5 km *and* destination-to-destination distance is ≤ 3 km, checked
  against a pool's fixed "anchor" (the first request that founded it) —
  reused unchanged from `feature/geography-zones`, now actually wired
  into pool assignment for the first time by
  [`pool-matching.ts`](apps/api/src/modules/rides/pool-matching.ts).
- **Fare model**: [`docs/fare-model.md`](docs/fare-model.md).
  Per-passenger `baseFare + distanceCharge`, with a 15% pool discount for
  a passenger who *joins* an existing pool (not for the one who founds
  it). Worked example with Nusrat and Rafiq's real trips is in that doc.
- **Concurrency**: every write that changes a `RideRequest`'s status or a
  `Pool`'s `seatsTaken` uses a conditional `updateMany` keyed on the value
  just read, checking `result.count === 0` to detect a lost race, instead
  of a naive read-then-write. This is the same fix already applied across
  the ride lifecycle (`cancelRideRequest`, `acceptRideRequest`,
  `markDriverArrived`, `startRide`, `completeRide` — see the commit
  history on `feature/ride-lifecycle`), extended here to pool seat
  claiming: joining a pool is `pool.updateMany({ where: { id, status:
  "OPEN", seatsTaken: { lte: capacity - seats } }, data: { seatsTaken: {
  increment: seats } } })`, so two passengers racing for the last seat
  can't both win. Multi-table writes (seat claim + request link; request
  status + pool lock) run inside `prisma.$transaction` so they commit or
  roll back together — a losing accept never leaves an orphaned pool or a
  request linked to a pool whose seat was never actually claimed. Verified
  both with an automated concurrent-request test and live, firing two
  truly simultaneous accepts at a real Postgres database.

## Driver-flow decisions

Two assumptions made building `feature/driver-flow`, stated explicitly
because both are things a reviewer would reasonably ask to have defended:

**Assumption 1 — "relevant requests" means all unmatched requests
system-wide, not zone-filtered.**
`GET /rides/available` (a driver's "relevant requests" list) returns
every currently `REQUESTED` ride request, with no location or zone
filtering. *Why:* nothing in the schema tracks a driver's location or a
registered "zone" for a driver — `Tesla` has no `lat`/`lng`, and
`docs/geography-and-matching.md` already documents "driver location: not
modeled" as a deliberate simplification for passenger-to-passenger
matching. Filtering "relevant" by driver zone would mean inventing a new
concept (a driver's registered zone) and a new schema field for it,
which wasn't asked for and would need its own design pass (what happens
when a driver's actual location drifts from their "registered" one?).
The simpler option — show everything, let the driver pick — is what the
existing data actually supports, so that's what's implemented. No
geography beyond passenger-to-passenger compatibility (the pickup/
destination proximity rule in `pool-matching.ts`) exists anywhere in
this codebase.

*Where the `isOnline` gate actually lives:* the original task assumed
`pool-matching.ts`'s matching function would need an `isOnline` filter
added to "candidate pools/drivers." It doesn't — `findCompatibleOpenPool`
never selects a driver; it only searches the *specific* driver's own
already-open pools, and that driver is already known because they're the
one calling `POST /rides/:id/accept`. There's no candidate-drivers query
to filter there. The real enforcement point is `acceptRideRequest`
itself (rejects with 409 if `tesla.isOnline` is false, before any
matching runs), plus `listAvailableRideRequests` returning nothing to an
offline driver so the UI doesn't show requests they can't act on.

**Assumption 2 — going offline never touches a pool already in
progress.**
Toggling `isOnline` off only stops this driver from being able to
`accept` *new* requests (`acceptRideRequest` now checks it, 409 if
offline). It does **not** cancel, lock, or otherwise touch any pool this
driver is already driving — `markDriverArrived`, `startRide`, and
`completeRide` don't check `isOnline` at all, so a driver can toggle
offline mid-trip (e.g. right after picking up their last rider for the
day) and still finish that trip normally. *Why:* "offline" models
"stop giving me new work," not "abandon what I'm already doing" — a
driver mid-pool has real passengers physically expecting to be dropped
off; silently stranding them because a status toggle was flipped would
be a correctness bug, not a feature. Verified directly: a driver who
goes offline after accepting a request can still call driver-arrived,
start, and complete on that same request (`test(driver): cover
online/offline gating and mid-trip continuity`).

## Key decisions/trade-offs

> TODO — capture as they're made, e.g. why paisa-integers over
> decimal/float for money, why one Tesla per driver.

- **Matching, fare model, and concurrency approach**: see "Matching, fare,
  and concurrency (pooling)" above and the linked docs for the full
  reasoning behind each.
- **Pool creation is driver-scoped, not automatic at request time**: a
  brand-new `Pool` always requires a specific `Tesla`, so matching only
  ever runs inside a driver's own `POST /rides/:id/accept` — never
  automatically at `POST /rides/request`, which would require inventing
  a "which online driver gets this" rule the assessment spec didn't
  define. This was confirmed as a deliberate scope decision before
  building, not assumed.
- **No fare rebalancing on join**: see `docs/fare-model.md`'s "Known
  asymmetry" section.

## Known limitations

> TODO.

- Pooling only ever considers a single driver's own open pools — there's
  no cross-driver "best available pool" ranking. A passenger's request
  can only join a pool on whichever driver happens to accept it.
- A pool's fare for its founding passenger never adjusts after someone
  else joins and starts saving (see `docs/fare-model.md`).
- The frontend does not yet visually group multiple passengers sharing
  one pool — `GET /rides/pools/mine` exists on the backend, but the
  driver dashboard UI still renders a flat per-request list
  (`GET /rides/driver-mine`). Flagged, not silently left unmentioned.

## Next improvements

> TODO.

### At scale

- **Matching lookup cost.** `findCompatibleOpenPool` scans every OPEN
  pool for one driver, in-process, one at a time. Fine at MVP scale (one
  driver has a handful of open pools at most); at real scale this needs
  either a spatial index (e.g., PostGIS, or bucket zones into a grid) so
  compatibility candidates come from a database query instead of an
  application-level loop, or a background matching service instead of
  synchronous per-accept computation.
- **Fare fairness**, per `docs/fare-model.md`: rebalance every active
  member's fare on each join rather than only discounting the joiner, and
  communicate re-quoted fares to already-matched passengers.
- **Cross-driver matching.** Right now a passenger only ever pools with
  whichever specific driver accepts their request. At scale, the more
  useful question is "which pool, across every online driver, is the best
  match" — that needs a dispatch/ranking layer, not just a per-driver
  accept action.
- **Concurrency at higher write volume.** The conditional-`updateMany`
  pattern holds up fine at MVP request rates, but under heavy concurrent
  load on a single hot pool, repeated 409-and-retry cycling becomes real
  contention. At scale this points toward either short-lived row-level
  locking (`SELECT ... FOR UPDATE`) around the seat-claim step, or a
  queue/serialization point per pool so accepts against the same pool
  don't all race the database simultaneously.

## AI Usage

> TODO — disclose AI tool usage per assessment requirements.

## Demo video link

> TODO.
