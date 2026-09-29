import { estimateFarePaisa } from "../../common/fare";
import { equirectangularDistanceKm } from "../../common/geo";
import { HttpError } from "../../common/httpError";
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
  const farePaisa = estimateFarePaisa(distanceKm);

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
