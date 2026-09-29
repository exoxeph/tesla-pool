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
| `GET /rides/available` | Driver | Pending (`REQUESTED`) requests, system-wide |
| `POST /rides/:id/accept` | Driver | Accept a request — joins a compatible open pool on this driver's own tesla, or founds a new one; finalizes `farePaisa` |
| `PATCH /rides/:id/driver-arrived` | Driver | `MATCHED → DRIVER_ARRIVED` |
| `PATCH /rides/:id/start` | Driver | `DRIVER_ARRIVED → STARTED`; locks the pool |
| `PATCH /rides/:id/complete` | Driver | `STARTED → COMPLETED` |
| `GET /rides/driver-mine` | Driver | This driver's own requests, flat list |
| `GET /rides/pools/mine` | Driver | This driver's own pools, each with its **full passenger list** (pickup/destination/status/fare per passenger) |

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
