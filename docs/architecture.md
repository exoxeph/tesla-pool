# Architecture

## Overview

Dhaka Tesla Pool is a monorepo with two apps, one database:

- `apps/web` — Next.js (App Router) frontend.
- `apps/api` — Express + TypeScript REST API, backed by PostgreSQL via Prisma.

## Diagram

![Backend architecture diagram](architecture-diagram.png)

The diagram above is a static capture. An interactive version — pan/zoom,
click a node to see its source citation, focus a single path — is checked in
at [`architecture-diagram.html`](architecture-diagram.html) (open it directly
in a browser; it's a self-contained file, no server needed). Generated with
[Archify](https://github.com/tt-a1i/archify) from the actual code at commit
`ce2f15818c52cbce69564ec5c1867a807359a6b1`; every node is cited against a real
file and line range, not hand-drawn from memory — see the diagram's own node
index for the exact citations, or the source files directly:

- `apps/api/src/app.ts` — Express app + router registration
- `apps/api/src/common/auth-middleware.ts` — `requireAuth` / `requireRole`
- `apps/api/src/common/rideLifecycle.ts` — the state machine
- `apps/api/src/modules/rides/rides.service.ts` — ride lifecycle, the status
  audit log (`logStatusEvent`), and the TESLAPAY wallet deduction (inline in
  `completeRide`)
- `apps/api/src/modules/rides/pool-matching.ts` — `findCompatibleOpenPool`
- `apps/api/src/db/prisma.ts` — the shared Prisma client

## Request flow

1. Passenger/driver authenticates against `apps/api` (JWT). Every protected
   route runs through `requireAuth`/`requireRole` before reaching any
   handler — identity always comes from the verified token, never from the
   request body.
2. Passenger submits a `RideRequest` (pickup zone, destination zone, seats,
   optional `paymentMethod`) and gets back an *estimated* fare.
3. A driver accepts a request. `findCompatibleOpenPool` checks that driver's
   own open pools for a route match; a match joins that pool (seat claimed
   atomically), otherwise a new pool is founded. The fare is finalized here —
   only at accept time is it known whether this passenger is founding a pool
   (no discount) or joining one (15% off).
4. The driver progresses the ride through `driver-arrived` → `start` →
   `complete`. Every attempted transition — including the losing side of a
   concurrency conflict — is written to `RideStatusEvent` inside the same
   transaction as the write it describes (see the main README's "Status
   audit log" section).
5. On `complete`, a `TESLAPAY` request atomically deducts its finalized fare
   from the passenger's wallet in that same transaction; insufficient balance
   rolls the whole completion back. `CASH` just records the method.

## ERD

See [`erd.md`](erd.md).
