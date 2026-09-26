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

> TODO — checklist, updated as feature branches merge. Currently: repo
> scaffold only, no user-facing features yet.

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

> TODO — document endpoints as they're implemented (currently only
> `GET /health`).

## Key decisions/trade-offs

> TODO — capture as they're made, e.g. why paisa-integers over
> decimal/float for money, why one Tesla per driver, matching strategy
> chosen.

## Known limitations

> TODO.

## Next improvements

> TODO.

## AI Usage

> TODO — disclose AI tool usage per assessment requirements.

## Demo video link

> TODO.
