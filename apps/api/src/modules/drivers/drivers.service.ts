import { HttpError } from "../../common/httpError";
import { prisma } from "../../db/prisma";

function toPublicTesla(tesla: {
  id: string;
  label: string;
  capacity: number;
  isOnline: boolean;
}) {
  return {
    id: tesla.id,
    label: tesla.label,
    capacity: tesla.capacity,
    isOnline: tesla.isOnline,
  };
}

// driverUserId always comes from the verified JWT (req.auth.sub), never
// from a request body or param — a driver can only ever read/write their
// own Tesla via this lookup.
export async function getOwnTesla(driverUserId: string) {
  const tesla = await prisma.tesla.findUnique({
    where: { driverId: driverUserId },
  });
  if (!tesla) {
    throw new HttpError(404, "No vehicle registered for this driver");
  }
  return toPublicTesla(tesla);
}

export async function updateOwnStatus(driverUserId: string, isOnline: boolean) {
  await getOwnTesla(driverUserId);
  const tesla = await prisma.tesla.update({
    where: { driverId: driverUserId },
    data: { isOnline },
  });
  return toPublicTesla(tesla);
}
