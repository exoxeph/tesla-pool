import { estimateFarePaisa } from "../../common/fare";
import { equirectangularDistanceKm } from "../../common/geo";
import { HttpError } from "../../common/httpError";
import { isValidTransition } from "../../common/rideLifecycle";
import { prisma } from "../../db/prisma";
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
  // Fare scales with seats: each seat is a ticket on this shared trip, not
  // a flat per-request charge — 3 seats costs 3x what 1 seat costs.
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

// Real multi-passenger pooling is feature/tesla-pooling's job. For now,
// accepting a request creates a "solo pool" — one Pool with a single
// RideRequest in it — using the same Pool model and capacity check that
// pooling will later extend to handle several passengers at once.
export async function acceptRideRequest(driverUserId: string, requestId: string) {
  const tesla = await prisma.tesla.findUnique({
    where: { driverId: driverUserId },
  });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
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

  // Runs as one transaction: the conditional updateMany only succeeds if
  // the request is still exactly the status we read above, so two drivers
  // accepting the same request at once can't both win. If this call loses
  // that race, the pool it just created is rolled back with it instead of
  // being left behind as an orphan nobody is actually in.
  const poolId = await prisma.$transaction(async (tx) => {
    const pool = await tx.pool.create({
      data: { teslaId: tesla.id, status: "OPEN", seatsTaken: request.seats },
    });

    const result = await tx.rideRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: { status: "MATCHED", poolId: pool.id },
    });
    if (result.count === 0) {
      throw new HttpError(409, "This request was already accepted by another driver");
    }

    return pool.id;
  });

  return toPublicRideRequest({ ...request, status: "MATCHED", poolId });
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
  const [updated] = await Promise.all([
    prisma.rideRequest.update({ where: { id: requestId }, data: { status: "STARTED" } }),
    prisma.pool.update({ where: { id: pool.id }, data: { status: "LOCKED" } }),
  ]);
  return toPublicRideRequest(updated);
}

export async function completeRide(driverUserId: string, requestId: string) {
  const { request, pool } = await loadOwnedRequest(driverUserId, requestId);
  if (!isValidTransition(request.status, "COMPLETED")) {
    throw new HttpError(409, `Cannot complete a ride from ${request.status}`);
  }

  const [updated] = await Promise.all([
    prisma.rideRequest.update({ where: { id: requestId }, data: { status: "COMPLETED" } }),
    prisma.pool.update({ where: { id: pool.id }, data: { status: "COMPLETED" } }),
  ]);
  return toPublicRideRequest(updated);
}

// Not part of the original spec, but the driver dashboard needs a data
// source for "requests relevant to this driver": open requests to accept,
// plus ones already assigned to this driver's tesla in progress.
export async function listAvailableRideRequests() {
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
