import { prisma } from "../../db/prisma";

export async function listZones() {
  const zones = await prisma.zone.findMany({ orderBy: { name: "asc" } });
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    lat: z.lat,
    lng: z.lng,
  }));
}
