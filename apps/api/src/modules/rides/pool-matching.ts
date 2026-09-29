import { zonesAreCompatible, type LatLng } from "../../common/geo";
import { prisma } from "../../db/prisma";

// Matching rule: reuse the exact pickup/destination proximity rule
// feature/geography-zones already documented and tested
// (PICKUP_THRESHOLD_KM / DESTINATION_THRESHOLD_KM in common/geo.ts) — this
// branch is the first to actually wire it into pool assignment. A
// candidate request is compared against the pool's "anchor": the earliest
// still-active (non-cancelled) RideRequest in that pool, never a shifting
// average of current members. See docs/geography-and-matching.md for the
// full "pool anchor" design this reuses unchanged.
export async function findCompatibleOpenPool(
  teslaId: string,
  teslaCapacity: number,
  pickup: LatLng,
  destination: LatLng,
  seats: number
): Promise<{ id: string } | null> {
  const openPools = await prisma.pool.findMany({
    where: { teslaId, status: "OPEN" },
    orderBy: { createdAt: "asc" },
  });

  for (const pool of openPools) {
    if (pool.seatsTaken + seats > teslaCapacity) {
      continue;
    }

    const anchor = await prisma.rideRequest.findFirst({
      where: { poolId: pool.id, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "asc" },
      include: { pickupZone: true, destinationZone: true },
    });
    if (!anchor) {
      // Every currently active member of this pool was cancelled — no
      // anchor left to compare against, so treat it as having no basis
      // for a compatibility decision rather than guessing.
      continue;
    }

    const compatible = zonesAreCompatible(
      { lat: anchor.pickupZone.lat!, lng: anchor.pickupZone.lng! },
      { lat: anchor.destinationZone.lat!, lng: anchor.destinationZone.lng! },
      pickup,
      destination
    );
    if (compatible) {
      return { id: pool.id };
    }
  }

  return null;
}
