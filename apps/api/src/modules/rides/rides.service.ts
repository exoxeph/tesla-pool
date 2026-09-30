import { calculatePerPassengerFarePaisa, estimateFarePaisa } from "../../common/fare";
import { equirectangularDistanceKm } from "../../common/geo";
import { HttpError } from "../../common/httpError";
import { isValidTransition } from "../../common/rideLifecycle";
import { prisma } from "../../db/prisma";
import { findCompatibleOpenPool } from "./pool-matching";
import type { CreateRideRequestInput } from "./rides.schema";

function toPublicRideRequest(request: {
  id: string;
  pickupZoneId: string;
  destinationZoneId: string;
  seats: number;
  status: string;
  farePaisa: number | null;
  poolId: string | null;
  createdAt: Date;
}) {
  return {
    id: request.id,
    pickupZoneId: request.pickupZoneId,
    destinationZoneId: request.destinationZoneId,
    seats: request.seats,
    status: request.status,
    farePaisa: request.farePaisa,
    poolId: request.poolId,
    createdAt: request.createdAt,
  };
}

export async function createRideRequest(
  passengerId: string,
  input: CreateRideRequestInput
) {
  const [pickupZone, destinationZone] = await Promise.all([
    prisma.zone.findUnique({ where: { id: input.pickupZoneId } }),
    prisma.zone.findUnique({ where: { id: input.destinationZoneId } }),
  ]);

  if (!pickupZone) {
    throw new HttpError(404, "Pickup zone not found");
  }
  if (!destinationZone) {
    throw new HttpError(404, "Destination zone not found");
  }

  const distanceKm = equirectangularDistanceKm(
    { lat: pickupZone.lat!, lng: pickupZone.lng! },
    { lat: destinationZone.lat!, lng: destinationZone.lng! }
  );
  // This is an estimate only — the pool discount can't be known until a
  // driver actually accepts (that's when it becomes clear whether this
  // passenger is founding a pool or joining one), so acceptRideRequest
  // recalculates and overwrites farePaisa with the final per-passenger
  // amount. Fare scales with seats either way: each seat is a ticket on
  // this shared trip, not a flat per-request charge.
  const farePaisa = estimateFarePaisa(distanceKm) * input.seats;

  const request = await prisma.rideRequest.create({
    data: {
      passengerId,
      pickupZoneId: input.pickupZoneId,
      destinationZoneId: input.destinationZoneId,
      seats: input.seats,
      farePaisa,
    },
  });

  return toPublicRideRequest(request);
}

export async function listOwnRideRequests(passengerId: string) {
  const requests = await prisma.rideRequest.findMany({
    where: { passengerId },
    orderBy: { createdAt: "desc" },
  });
  return requests.map(toPublicRideRequest);
}

export async function cancelRideRequest(
  requestId: string,
  passengerId: string
) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new HttpError(404, "Ride request not found");
  }
  if (request.passengerId !== passengerId) {
    throw new HttpError(403, "Forbidden");
  }
  if (!isValidTransition(request.status, "CANCELLED")) {
    throw new HttpError(409, "This ride can no longer be cancelled");
  }

  // Conditional on the status just read: guards against a concurrent
  // driver action (accept/arrived/start) changing the status between this
  // read and the write. If that happened, count is 0 and this fails
  // instead of cancelling a ride that's already moved on underneath it.
  const result = await prisma.rideRequest.updateMany({
    where: { id: requestId, status: request.status },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) {
    throw new HttpError(409, "This ride can no longer be cancelled");
  }

  return toPublicRideRequest({ ...request, status: "CANCELLED" });
}

// Accepting a request either joins an existing compatible OPEN pool on
// this driver's own tesla (real multi-passenger pooling) or founds a new
// one if no candidate matches — see pool-matching.ts for the rule and
// docs/geography-and-matching.md for the anchor design. Either way, the
// seat claim and the request's pool link are atomic within one
// transaction: never link a request to a pool whose seat wasn't actually
// claimed (avoids the orphaned-pool pattern fixed on feature/ride-lifecycle).
export async function acceptRideRequest(driverUserId: string, requestId: string) {
  const tesla = await prisma.tesla.findUnique({
    where: { driverId: driverUserId },
  });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }
  // Going offline must never cancel or abandon a pool already in
  // progress — it only stops NEW requests from matching to this driver.
  // This is the one place that matters: markDriverArrived/startRide/
  // completeRide operate on a request already linked to a pool, so they
  // aren't gated here and keep working even if the driver goes offline
  // mid-trip (e.g. toggling off right after picking up their last rider).
  if (!tesla.isOnline) {
    throw new HttpError(409, "Go online to accept new requests");
  }

  const request = await prisma.rideRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    throw new HttpError(404, "Ride request not found");
  }
  if (!isValidTransition(request.status, "MATCHED")) {
    throw new HttpError(409, `Cannot accept a request that is ${request.status}`);
  }
  if (request.seats > tesla.capacity) {
    throw new HttpError(409, "Requested seats exceed this vehicle's capacity");
  }

  const [pickupZone, destinationZone] = await Promise.all([
    prisma.zone.findUnique({ where: { id: request.pickupZoneId } }),
    prisma.zone.findUnique({ where: { id: request.destinationZoneId } }),
  ]);
  if (!pickupZone || !destinationZone) {
    throw new HttpError(404, "Zone not found");
  }
  const pickup = { lat: pickupZone.lat!, lng: pickupZone.lng! };
  const destination = { lat: destinationZone.lat!, lng: destinationZone.lng! };
  const distanceKm = equirectangularDistanceKm(pickup, destination);

  const candidate = await findCompatibleOpenPool(
    tesla.id,
    tesla.capacity,
    pickup,
    destination,
    request.seats
  );
  // Fare is finalized here, not at request creation: only at accept time
  // do we know whether this passenger is founding a pool (no discount) or
  // joining one that already has another active passenger (discounted).
  const farePaisa = calculatePerPassengerFarePaisa(distanceKm, request.seats, candidate !== null);

  // Runs as one transaction: the seat claim (join an existing pool, or
  // create a new one) and the conditional request-link updateMany either
  // both land or neither does. The request-link is conditional on the
  // status just read above, so two drivers accepting the same request at
  // once can't both win — a losing call rolls back whatever seat claim or
  // pool creation it just made, instead of leaving it behind as an orphan.
  const poolId = await prisma.$transaction(async (tx) => {
    let targetPoolId: string;

    if (candidate) {
      // Atomic seat claim: only increments if the pool is still OPEN and
      // still has room for these seats. This is the Nusrat/Shirin
      // last-seat race — two concurrent joins racing for the same
      // remaining seat can't both succeed; the loser gets count === 0.
      const joinResult = await tx.pool.updateMany({
        where: {
          id: candidate.id,
          status: "OPEN",
          seatsTaken: { lte: tesla.capacity - request.seats },
        },
        data: { seatsTaken: { increment: request.seats } },
      });
      if (joinResult.count === 0) {
        throw new HttpError(409, "This pool no longer has room for your request");
      }
      targetPoolId = candidate.id;
    } else {
      const pool = await tx.pool.create({
        data: { teslaId: tesla.id, status: "OPEN", seatsTaken: request.seats },
      });
      targetPoolId = pool.id;
    }

    const result = await tx.rideRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: { status: "MATCHED", poolId: targetPoolId, farePaisa },
    });
    if (result.count === 0) {
      throw new HttpError(409, "This request was already accepted by another driver");
    }

    return targetPoolId;
  });

  return toPublicRideRequest({ ...request, status: "MATCHED", poolId, farePaisa });
}

// Shared by driver-arrived/start/complete: loads the request's pool and
// tesla, and confirms this driver owns that tesla before allowing any
// state change — the same "identity from req.auth, ownership checked
// against the resource" pattern as drivers.service.ts's getOwnTesla.
async function loadOwnedRequest(driverUserId: string, requestId: string) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    throw new HttpError(404, "Ride request not found");
  }
  if (!request.poolId) {
    throw new HttpError(409, "This request has not been accepted yet");
  }

  const pool = await prisma.pool.findUnique({ where: { id: request.poolId } });
  if (!pool) {
    throw new HttpError(404, "Pool not found");
  }

  const tesla = await prisma.tesla.findUnique({ where: { id: pool.teslaId } });
  if (!tesla || tesla.driverId !== driverUserId) {
    throw new HttpError(403, "Forbidden");
  }

  return { request, pool };
}

export async function markDriverArrived(driverUserId: string, requestId: string) {
  const { request } = await loadOwnedRequest(driverUserId, requestId);
  if (!isValidTransition(request.status, "DRIVER_ARRIVED")) {
    throw new HttpError(409, `Cannot mark arrived from ${request.status}`);
  }

  // Conditional on the status just read: guards against a concurrent
  // cancel (or, in principle, another driver action racing on the same
  // request) landing between this read and the write.
  const result = await prisma.rideRequest.updateMany({
    where: { id: requestId, status: request.status },
    data: { status: "DRIVER_ARRIVED" },
  });
  if (result.count === 0) {
    throw new HttpError(409, "This request's status changed before the update could apply");
  }

  return toPublicRideRequest({ ...request, status: "DRIVER_ARRIVED" });
}

export async function startRide(driverUserId: string, requestId: string) {
  const { request, pool } = await loadOwnedRequest(driverUserId, requestId);
  if (!isValidTransition(request.status, "STARTED")) {
    throw new HttpError(409, `Cannot start a ride from ${request.status}`);
  }

  // The pool locks here, not at driver-arrived: a driver who has arrived
  // but not yet pulled away should still be able to pick up one more
  // compatible passenger.
  //
  // Request update and pool lock run in one transaction: previously these
  // were two independent writes (Promise.all, not transactional), so a
  // dropped write between them could leave a request marked STARTED with
  // its pool still OPEN, or the reverse. The request update is also
  // conditional on the status just read, guarding against a concurrent
  // cancel landing in between.
  await prisma.$transaction(async (tx) => {
    const result = await tx.rideRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: { status: "STARTED" },
    });
    if (result.count === 0) {
      throw new HttpError(409, "This request's status changed before start could apply");
    }
    await tx.pool.update({ where: { id: pool.id }, data: { status: "LOCKED" } });
  });

  return toPublicRideRequest({ ...request, status: "STARTED" });
}

export async function completeRide(driverUserId: string, requestId: string) {
  const { request, pool } = await loadOwnedRequest(driverUserId, requestId);
  if (!isValidTransition(request.status, "COMPLETED")) {
    throw new HttpError(409, `Cannot complete a ride from ${request.status}`);
  }

  // Same shape as startRide: one transaction, conditional on the status
  // just read, so request and pool status can't land in different
  // outcomes and a concurrent action can't be silently overwritten.
  await prisma.$transaction(async (tx) => {
    const result = await tx.rideRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: { status: "COMPLETED" },
    });
    if (result.count === 0) {
      throw new HttpError(409, "This request's status changed before completion could apply");
    }
    await tx.pool.update({ where: { id: pool.id }, data: { status: "COMPLETED" } });
  });

  return toPublicRideRequest({ ...request, status: "COMPLETED" });
}

// "Relevant requests" for a driver — the simple option, chosen
// deliberately: all currently unmatched (REQUESTED) requests system-wide,
// not filtered by any driver location/zone. There's nothing to filter
// by — no driver lat/lng, no registered driver zone anywhere in the
// schema (geography-and-matching.md documents this as a deliberate
// simplification for passenger-to-passenger matching too, not an
// oversight specific to this endpoint). Building a zone-based filter
// would mean adding a new schema field and inventing a "driver's zone"
// concept nothing else in the app tracks, for a real capability
// (geolocation-aware dispatch) explicitly out of scope per the PRD.
// See README's "Driver-flow decisions" section for the full reasoning.
//
// Gated by online status: an offline driver sees nothing here, since
// they can't act on any of it anyway (acceptRideRequest rejects with
// 409 regardless) — showing requests a driver can't currently accept
// would be misleading, not just an incomplete list.
export async function listAvailableRideRequests(driverUserId: string) {
  const tesla = await prisma.tesla.findUnique({ where: { driverId: driverUserId } });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }
  if (!tesla.isOnline) {
    return [];
  }

  const requests = await prisma.rideRequest.findMany({
    where: { status: "REQUESTED" },
    orderBy: { createdAt: "asc" },
  });
  return requests.map(toPublicRideRequest);
}

export async function listOwnDriverRideRequests(driverUserId: string) {
  const tesla = await prisma.tesla.findUnique({ where: { driverId: driverUserId } });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }

  const pools = await prisma.pool.findMany({ where: { teslaId: tesla.id } });
  const poolIds = pools.map((p) => p.id);

  const requests = await prisma.rideRequest.findMany({
    where: { poolId: { in: poolIds } },
    orderBy: { createdAt: "asc" },
  });
  return requests.map(toPublicRideRequest);
}

// Shared shape for "a pool plus its full passenger list" — every
// passenger's own pickup/destination/status/fare, not just whoever
// joined most recently. Used by the mine/detail/history endpoints below
// so the response shape only lives in one place.
async function toPoolWithPassengers(pool: { id: string; status: string; seatsTaken: number }, capacity: number) {
  const requests = await prisma.rideRequest.findMany({
    where: { poolId: pool.id },
    orderBy: { createdAt: "asc" },
    include: { passenger: true },
  });

  return {
    id: pool.id,
    status: pool.status,
    seatsTaken: pool.seatsTaken,
    capacity,
    passengers: requests.map((r) => ({
      requestId: r.id,
      passengerName: r.passenger.name,
      pickupZoneId: r.pickupZoneId,
      destinationZoneId: r.destinationZoneId,
      seats: r.seats,
      status: r.status,
      farePaisa: r.farePaisa,
    })),
  };
}

// Driver-facing: the full passenger list per pool, not a flat list of
// individual rides — this is what actually shows a driver that a pool is
// shared, since listOwnDriverRideRequests (above) only gives one flat
// list with no grouping.
export async function listOwnPoolsWithPassengers(driverUserId: string) {
  const tesla = await prisma.tesla.findUnique({ where: { driverId: driverUserId } });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }

  const pools = await prisma.pool.findMany({
    where: { teslaId: tesla.id },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(pools.map((pool) => toPoolWithPassengers(pool, tesla.capacity)));
}

// Single-pool detail, by id. Unlike listOwnPoolsWithPassengers (always
// scoped to "my" tesla with no id to smuggle), this one takes an
// attacker-controllable :id param, so ownership has to be checked
// explicitly — 404 if the pool doesn't exist, 403 if it exists but
// belongs to a different driver's tesla. Never reveals whether a pool
// exists for a driver who doesn't own it beyond that 403/404 split.
export async function getOwnPoolDetail(driverUserId: string, poolId: string) {
  const tesla = await prisma.tesla.findUnique({ where: { driverId: driverUserId } });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new HttpError(404, "Pool not found");
  }
  if (pool.teslaId !== tesla.id) {
    throw new HttpError(403, "Forbidden");
  }

  return toPoolWithPassengers(pool, tesla.capacity);
}

// Ride/pool history: pools this driver has driven to a terminal state
// (COMPLETED or CANCELLED), most recent first. Note: nothing in the
// current codebase ever actually sets Pool.status to CANCELLED — only
// individual RideRequests cancel, independent of their pool's overall
// status — so in practice this only ever returns COMPLETED pools today.
// Included anyway since CANCELLED is a real value of PoolStatus and a
// history view should show it if it's ever reached, rather than baking
// in today's reachability as a permanent assumption.
export async function listOwnPoolHistory(driverUserId: string) {
  const tesla = await prisma.tesla.findUnique({ where: { driverId: driverUserId } });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }

  const pools = await prisma.pool.findMany({
    where: { teslaId: tesla.id, status: { in: ["COMPLETED", "CANCELLED"] } },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(pools.map((pool) => toPoolWithPassengers(pool, tesla.capacity)));
}
