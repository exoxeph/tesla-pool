# Architecture

> TODO — expand as modules land.

## Overview

Dhaka Tesla Pool is a monorepo with two apps:

- `apps/web` — Next.js (App Router) frontend.
- `apps/api` — Express + TypeScript REST API, backed by PostgreSQL via Prisma.

## Request flow (planned)

1. Passenger/driver authenticates against `apps/api` (JWT).
2. Passenger submits a `RideRequest` (pickup zone, destination zone, seats).
3. Matching logic assigns the request to an existing `Pool` with spare
   capacity on a compatible route, or opens a new `Pool` against an online
   `Tesla`.
4. Driver progresses the `Pool`/`RideRequest` lifecycle (arrived, started,
   completed) from the driver flow.

## TODO

- Diagram (sequence + component) once matching logic is implemented.
- Auth flow detail.
- Deployment topology.
